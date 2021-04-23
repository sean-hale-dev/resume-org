const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const port = 8080;
const bodyParser = require('body-parser');
const fs = require('fs');
const formidable = require('formidable');
const child_process = require('child_process');
const path = require('path');
const mongo_client = require('mongodb');
// import search from './search.js';
const search = require('./utils/search.js');
const { strict } = require('assert');
const { getClientPermissions, hasServerPermission, PERMISSION_LEVELS } = require('./utils/auth.js');

// TODO: ADD AUTHENTICATION

mongo_client.connect(
  process.env.MONGO_SERVER_URI,
  { useUnifiedTopology: true },
  function (err, database) {
    if (err) throw err;

    var db = database.db('resume_org');

    console.log('Connected with MongoDB!');

    app.use(function (req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
      );
      next();
    });

    app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
    app.use(bodyParser.json({ limit: '10mb' }));

    app.post('/resume-upload', (req, res) => {
      var form = new formidable.IncomingForm();
      var userID;
      form.parse(req);

      form.on('field', (fieldName, fieldValue) => {
        if (fieldName == 'userID') userID = fieldValue;
      });

      form.on('fileBegin', function (name, file) {
        file.path = `${__dirname}/resumes/${file.name}`;
      });

      form.on('file', function (name, file) {
        console.log(`File uploaded - "${file.path}"`);
        if (userID == undefined) {
          userID = 'UserTest';
        }

        db.collection('resumes').findOne(
          { employee: userID },
          (err, result) => {
            console.log('Username:', userID);

            // user never uploaded a resume before - run it through the parser
            if (result == null) {
              console.log('It is a new resume - add it to the database');

              dbGetKeys(db).then((result) => {
                console.log('Get keys - promise done:');
                allCurrentKeys = result.map((doc) => doc.name);
                console.log(allCurrentKeys);
                parseResume(
                  res,
                  [file.path],
                  db,
                  true,
                  allCurrentKeys,
                  file.type,
                  userID
                );
              });
            }
            // user already uploaded a resume - remove the old one before running new one through the parser
            else {
              console.log('It is an updated resume');
              var id = result['_id'];

              // remove the original resume's ObjectId from the skill_assoc lists
              db.collection('skill_assoc').updateMany(
                { name: { $in: [...result['skills']] } },
                { $pull: { resumes: id } },
                (err, updatedDocs) => {
                  // remove the original resume
                  db.collection('resumes').deleteOne(
                    { _id: id },
                    (err, removedResult) => {
                      if (err) console.error(err);
                    }
                  );
                }
              );
              // now that the old resume has been removed from the database, put the new one in
              dbGetKeys(db).then((result) => {
                console.log('Get keys - promise done:');
                allCurrentKeys = result.map((doc) => doc.name);
                console.log(allCurrentKeys);
                parseResume(
                  res,
                  [file.path],
                  db,
                  true,
                  allCurrentKeys,
                  file.type,
                  userID
                );
              });
            }
          }
        );
      });
    });

    app.post('/resume-search', (req, res) => {
      console.log('Searching');
      const queryString = req.body.queryString || '(c | !c)';
      resumeSearch(queryString, db, res);
    });

    app.post('/resume-report', (req, res) => {
      console.log('Generating report');
      const queryString = req.body.queryString || '(c | !c)';
      generateReport(queryString, db, res);
    });

    // TEMP
    app.get('/resume-report', (req, res) => {
      const queryString = 'javascript & c';
      generateReport(queryString, db, res);
    })


    // lets the client download a resume from the database
    app.get('/resume-download', (req, res) => {
      // if searching by ObjectId
      if (req.query.id) {
        getResumeByID(db, mongo_client.ObjectId(req.query.id))
          .then((resume) => {
            var download_path = downloadResumeToServer(
              db,
              resume.resume,
              getExtFromType(resume.type),
              resume.employee
            );
            console.log(`File redownloaded to server from database`);
            sendResumeDownloadToClient(download_path, res);
          })
          .catch(() => {
            console.log(`No resume found with _id = ${req.query.id}`);
          });
      }
      // if searching by employee
      else if (req.query.employee) {
        getResumeByEmployee(db, req.query.employee)
          .then((resume) => {
            var download_path = downloadResumeToServer(
              db,
              resume.resume,
              getExtFromType(resume.type),
              resume.employee
            );
            console.log(`File redownloaded to server from database`);
            sendResumeDownloadToClient(download_path, res);
          })
          .catch((e) => {
            console.log(
              `No resume found with "employee" = ${req.query.employee}`
            );
            console.log(e);
          });
      }
      // if neither "id" nor "employee" have values set in the query string
      else {
        res.send(`Must search with query string "id" or "employee"`);
      }
    });

    app.post('/login', (req, res) => {
      const { userID } = req.body;
      console.log(`Logging in ${userID}`);
      handleLogin(userID, db, res);
    });

    app.post('/getProfile', (req, res) => {
      const { userID } = req.body;
      getProfile(userID, db, res);
    });

    app.post('/updateProfile', (req, res) => {
      const { userID, details } = req.body;
      updateProfile(userID, details, db, res);
    });

    app.post('/getResumeSkills', (req, res) => {
      const { userID } = req.body;
      getResumeSkillsByUserID(userID, db, res);
    });

    app.post('/updateResumeSkills', (req, res) => {
      const { userID, skills } = req.body;
      updateResumeSkillsByUserID(userID, skills, db, res);
    });

    app.get('/getAllSearchableSkills', (req, res) => {
      getAllSearchableSkills(db, res);
    });

    /**
     * Query items:
     * @query userID Fully optional; userID to check
     */
    app.get('/getClientPermissions', (req, res) => {
      const { userID } = req.query;
      hasServerPermission(userID, db, '/getClientPermissions').then(authorized => {
        if (authorized) {
          getClientPermissions(userID, db).then(perms => res.json(perms));
        } else {
          res.json([]);
        }
      });
    });

    app.post('/adminGetProfiles', (req, res) => {
      const { userID } = req.body;
      console.log("Fetching all profiles");
      hasServerPermission(userID, db, '/adminGetProfiles').then(authorized => {
        if (authorized) {
          console.log("Admin perms granted");
          adminGetProfiles(db, res);
        } else {
          res.json([]);
        }
      });
    });

    app.post('/adminUpdateProfile', (req, res) => {
      const { userID, targetUserID, updates } = req.body;
      hasServerPermission(userID, db, '/adminUpdateProfile').then(authorized => {
        if (authorized) {
          adminUpdateProfile(db, res, targetUserID, updates);
        } else {
          res.json([]);
        }
      });
    });

    app.post('/adminDeleteProfile', (req, res) => {
      const { userID, targetUserID } = req.body;
      hasServerPermission(userID, db, '/adminDeleteProfile').then(authorized => {
        if (authorized) {
          adminDeleteProfile(db, res, targetUserID);
        } else {
          res.json([]);
        }
      });
    });

    app.listen(port, () => {
      console.log(`Listening on *:${port}`);
    });
});

// Get list of all user profiles
function adminGetProfiles(db, res) {
  db.collection('employees').find({}).toArray((err, results) => {
    // console.log(err);
    // console.log(results);
    if (err) {
      res.json([]);
    } else {
      res.json(results);
    }
  })
}

/**
 * Update an arbitrary user profile
 * @param {mongo_client.Db} db 
 * @param {*} res 
 * @param {String} targetUserID 
 * @param {Object} updates 
 */
function adminUpdateProfile(db, res, targetUserID, details) {
  console.log(`Updating ${targetUserID} to ${JSON.stringify(details)}`);
  targetUserID = `${targetUserID}`;
  const updates = {};
  if (details.name) updates.name = `${details.name}`;
  if (details.yearsExperience) updates.yearsExperience = `${details.yearsExperience}`;
  if (details.position) updates.position = `${details.position}`;
  if (details.role && PERMISSION_LEVELS[details.role] !== undefined) updates.role = `${details.role}`;
  // TODO: Add update user ID functionality
  const updateDB = async () => {
    if (Object.keys(updates).length) {
      await db.collection('employees').updateOne(
        { userID: targetUserID },
        {
          $set: updates,
        }
      )
    }
    if (details.userID) {
      const newUserID = `${details.userID}`;
      const resumeUpdatePromises = [];
      resumeUpdatePromises.push(db.collection('employees').updateOne(
        { userID: targetUserID },
        {
          $set: {userID: newUserID},
        }
      ));
      resumeUpdatePromises.push(db.collection('resumes').updateOne(
        { employee: targetUserID },
        {
          $set: {employee: newUserID},
        }
      ));
      await Promise.all(resumeUpdatePromises);
    }
  }
  updateDB().then(() => {
    adminGetProfiles(db, res);
  })
}

/**
 * Delete an arbitrary user profile
 * @param {mongo_client.Db} db 
 * @param {*} res 
 * @param {String} targetUserID 
 */
function adminDeleteProfile(db, res, targetUserID) {
  console.log(`Attempting to delete ${targetUserID}`);
  db.collection('resumes').findOne({employee: targetUserID}).then(resume => {
    console.log("Resume to delete:");
    console.log(resume);
    const employeeDeletionPromises = [];
    if (resume && Array.isArray(resume.skills)) {
      console.log(`Removing employee ${resume.employee}'s resume from skills: ${resume.skills.join(", ")}`)
      employeeDeletionPromises.push(
        db.collection('skill_assoc').updateMany(
          {name: {$in: resume.skills}},
          {$pull: {resumes: resume._id}}
        )
      );
    }
    if (resume) {
      console.log(`Removing employee ${resume.employee}'s resume`);
      employeeDeletionPromises.push(db.collection('resumes').deleteOne({_id: resume._id}));
    }
    employeeDeletionPromises.push(
      db.collection('employees').deleteOne({userID: targetUserID})
    );
    Promise.all(employeeDeletionPromises).then(() => {
      adminGetProfiles(db, res);
    })
  })
}

// Get list of all skills for searching
function getAllSearchableSkills(db, res) {
  db.collection('skill_assoc').find({name: {$exists: true}}).toArray((err, results) => {
    if (err) {
      res.json([]);
    } else {
      const skills = results.filter(result => result.resumes && result.resumes.length).map(result => result.name);
      // console.log(skills);
      res.json(skills);
    }
  })
}

// Validate search query
function validateSearchQueryParentheses(queryString) {
  if (typeof queryString !== 'string') {
    return false;
  }
  let parenthesisTracker = 0;
  for (let i = 0; i < queryString.length; i++) {
    const char = queryString.charAt(i);
    if (char == ")") parenthesisTracker--;
    if (char == "(") parenthesisTracker++;
    if (parenthesisTracker < 0) return false;
  }
  return parenthesisTracker == 0;
}

function validateSearchQueryMacros(queryString) {
  const regExpMacro = /\$\d*\$/; // Regular expression that matches search 
  const queryStringMacros = queryString.match(regExpMacro);
  console.log(queryStringMacros);
  return !queryStringMacros || queryStringMacros.length == 0;
}

// validateSearchQueryMacros("Simple String");
// validateSearchQueryMacros("Simple String$100");
// validateSearchQueryMacros("Simple String$100$eeee");
// validateSearchQueryMacros("Simple String$100e$eeee");
// validateSearchQueryMacros("Simple String$100$ee$24342$ee");
// validateSearchQueryMacros("Simple String$10er0$ee$24342$ee");
// validateSearchQueryMacros("Simple String$10er0$0$24342e$ee");

function validateSearchQuery(queryString) {
  const parenthesesGood = validateSearchQueryParentheses(queryString);
  const macrosGood = validateSearchQueryMacros(queryString);
  const issues = [];
  if (!parenthesesGood) issues.push("Mismatched parentheses");
  if (!macrosGood) issues.push("Query contains a problematic search macro");
  return {good: issues.length == 0, issues};
}

// Fetch resume skills by userID
function getResumeSkillsByUserID(userID, db, res) {
  // db.collection('employees')
  //   .findOne({ userID })
  //   .then((employee) => {
  //     if (employee && employee.resume) {
        db.collection('resumes')
          .findOne({employee: userID})
          .then((resume) => {
            if (resume && resume.skills) {
              res.json({ skills: resume.skills });
            } else {
              res.json({ skills: [] });
            }
          });
    //   } else {
    //     res.json({ skills: [] });
    //   }
    // });
}

// Update resume skills
// TODO: Update this to not break searching
function updateResumeSkillsByUserID(userID, skills, db, res) {
  // Filter skills to ensure no duplicates
  skills =
    skills && Array.isArray(skills)
      ? [...new Set(skills.filter((skill) => skill).map((skill) => `${skill}`))]
      : [];
  
  const newSkillsSet = new Set(skills);
  db.collection('resumes').findOne({employee: userID}).then(oldResume => {
    if (!oldResume) {
      res.json([]);
      return;
    };
    const oldResumeSkillsSet = new Set(oldResume && oldResume.skills ? oldResume.skills : []);
    const skillsToRemove = [...oldResumeSkillsSet].filter(skill => !newSkillsSet.has(skill));
    const skillsToAdd = [...newSkillsSet].filter(skill => !oldResumeSkillsSet.has(skill));
    console.log(`Old skills: ${JSON.stringify([...oldResumeSkillsSet])}`);
    console.log(`New skills: ${JSON.stringify([...newSkillsSet])}`);
    console.log(`Removing ${JSON.stringify(skillsToRemove)}`);
    console.log(`Adding ${JSON.stringify(skillsToAdd)}`);
    db.collection('skill_assoc').find({name: {$exists: true}}).toArray((err, allSkills) => {
      let existingSkillNames = [];
      if (!err) {
        existingSkillNames = allSkills.map(result => result.name);
      }
      const existingSkillNamesSet = new Set(existingSkillNames);
      const skillsToInitInSearch = skillsToAdd.filter(skill => !existingSkillNamesSet.has(skill));
      console.log(`Initializing skills in skill_assoc: ${JSON.stringify(skillsToInitInSearch)}`);
      const initSkills = async (skillsToInit) => {
        if (skillsToInit.length) {
          await db.collection('skill_assoc').insertMany(skillsToInitInSearch.map(name => ({name, resumes: []})));
        }
        return;
      }
      initSkills(skillsToInitInSearch).then(() => {
        db.collection('skill_assoc').updateMany(
          {name: {$in: skillsToRemove}},
          {$pull: {resumes: oldResume._id}}).then(() => {
            db.collection('skill_assoc').updateMany(
              {
                name: {
                  $in: skillsToAdd,
                },
              },
              {
                $push: {
                  resumes: oldResume._id,
                },
              }
            ).then(() => {
              db.collection('resumes')
              .updateOne(
                {employee: userID},
                {
                  $set: { skills },
                }
              )
              .then(() => {
                getResumeSkillsByUserID(userID, db, res);
              });
            });
        });
      });
    });
  });
}

// Handle user login
function handleLogin(userID, db, res) {
  db.collection('employees')
    .findOne({ userID })
    .then((employee) => {
      if (employee) {
        res.json(employee);
      } else {
        db.collection('employees')
          .insertOne({ userID })
          .then(() => res.json({ userID }));
      }
    });
}

function getProfile(userID, db, res) {
  db.collection('employees')
    .findOne({ userID })
    .then((employee) => {
      employeeData = {
        userID,
        position: employee.position || '',
        name: employee.name || '',
        yearsExperience: employee.yearsExperience || false,
      };
      res.json(employeeData);
    });
}

// TODO: This should *definitely* have authentication
function updateProfile(userID, details, db, res) {
  const updates = {};
  if (details.name !== undefined) updates.name = details.name;
  if (details.position !== undefined) updates.position = details.position;
  if (details.yearsExperience !== undefined)
    updates.yearsExperience = details.yearsExperience;
  db.collection('employees')
    .updateOne(
      { userID },
      {
        $set: updates,
      }
    )
    .then(() => getProfile(userID, db, res));
}

// Searches for resumes matching queryString
function resumeSearch(searchString, db, res) {
  const validation = validateSearchQuery(searchString);
  if (!validation.good) {
    console.log(`Search validation errors: ${validation.issues.join(", ")}`);
    res.json([]);
    return;
  }
  
  // Parsing for return object
  const searchTerms = searchString.toLowerCase().split(/[\|\*&!\(\)]+/).map(term => term.trim());
  const trimmedSearchTermsSet = new Set(searchTerms.filter((term, index) => term || index == searchTerms.length - 1));

  // Function responsible for generating the employee return obj
  const resumeLookup = (resID) =>
    new Promise((resolve, reject) => {
      let returnObj = {};
      // Lookup resume information
      db.collection('resumes')
        .findOne({ _id: new mongo_client.ObjectId(resID) })
        .then((resume) => {
          returnObj = {
            _id: (resume && resume._id) || false,
            type: (resume && resume.type) || false,
            skills: (resume && resume.skills && resume.skills.filter(skill => trimmedSearchTermsSet.has(skill)).sort()) || [],
            employee: (resume && resume.employee) || false,
            employeeID: (resume && resume.employee) || false,
          };

          if (returnObj.employee)
            return db
              .collection('employees')
              .findOne({ userID: returnObj.employee });
          else {
            // If no employee associated with this resume, reject the promise
            (returnObj.experience = false), (returnObj.position = false);

            reject('ERROR: No employee assosiated with this id');
          }
        })
        .then((empl) => {
          // Lookup and add employee data
          returnObj.employee = empl.name;
          returnObj.experience = empl.yearsExperience;
          returnObj.position = empl.position;

          resolve(returnObj);
        });
    });

  search.search(searchString).then((resumeIDSet) => {
    const resumeGetPromises = [...resumeIDSet.payload].map((id) =>
      db.collection('resumes').findOne({ _id: new mongo_client.ObjectId(id) })
    );

    // Generate employe return objs
    Promise.all(resumeGetPromises).then((resumes) => {
      resumePromises = resumes.map((resume) => resumeLookup(resume._id));

      // Upon all promises resolving, send the return objs
      Promise.all(resumePromises).then((resumesObjs) => {
        res.json(resumesObjs);
      });
    });
  });
}

// Resume Report Generator
function generateReport(searchString, db, res) {
  const validation = validateSearchQuery(searchString);
  const response = {
    employeeCount: 0,
    error: false,
    message: "",
    strictMatchCount: 0,
    looseMatchCount: 0,
    individualSkillMatches: {},
  }

  if (!validation.good) {
    console.log(`Search validation errors: ${validation.issues.join(", ")}`);
    response.message = `Search validation errors: ${validation.issues.join(", ")}`;
    response.error = true;
    res.json(response);
    return;
  }

  const searchTerms = searchString.toLowerCase().split(/[\|\*&!\(\)]+/).map(term => term.trim());
  const trimmedSearchTerms = searchTerms.filter((term, index) => term || index == searchTerms.length - 1);
  const looseSearchString = trimmedSearchTerms.join(" | ");
  // if (!validation.good) {
  //   console.log(`Search validation errors: ${validation.issues.join(", ")}`);
  //   res.json([]);
  //   return;
  // }
  const searchPromises = [...new Set(trimmedSearchTerms)].map(skill => search.search(skill).then(resumeIDSet => {
    if (resumeIDSet.status != -1) {
      response.individualSkillMatches[skill] = resumeIDSet.payload.size;
    }
  }));
  searchPromises.push(db.collection('resumes').countDocuments({}).then(resumeCount => {
    response.employeeCount = resumeCount || 0;
  }));
  searchPromises.push(search.search(searchString).then(resumeIDSet => {
    if (resumeIDSet.status != -1) {
      response.strictMatchCount = resumeIDSet.payload.size;
    }
  }));
  searchPromises.push(search.search(looseSearchString).then(resumeIDSet => {
    if (resumeIDSet.status != -1) {
      response.looseMatchCount = resumeIDSet.payload.size;
    }
  }));
  Promise.all(searchPromises).then(() => res.json(response));

  // db.collection('resumes').countDocuments({}).then(resumeCount => {
  //   response.employeeCount = resumeCount || 0;
  //   if (!validation.good) {
  //     console.log(`Search validation errors: ${validation.issues.join(", ")}`);
  //     response.message = `Search validation errors: ${validation.issues.join(", ")}`;
  //     response.error = true;
  //     res.json(response);
  //     return;
  //   } else {
  //     search.search(searchString).then(resumeIDSet => {
  //       console.log(resumeIDSet);
  //       if (resumeIDSet.status == -1) {
  //         res.json(response);
  //         return;
  //       }
  //       response.strictMatchCount = resumeIDSet.payload.size;
  //       const searchTerms = searchString.toLowerCase().split(/[\|\*&!\(\)]+/).map(term => term.trim());
  //       const trimmedSearchTerms = searchTerms.filter((term, index) => term || index == searchTerms.length - 1);
  //       const looseSearchString = trimmedSearchTerms.join(" | ");
  //       search.search(looseSearchString).then(looseResumeIDSet => {
  //         console.log(looseResumeIDSet);
  //         if (looseResumeIDSet.status == -1) {
  //           res.json(response);
  //           return;
  //         }
  //         response.looseMatchCount = looseResumeIDSet.payload.size;
  //         res.json(response);
  //       })
  //     })
  //   }
  // })
}

// uploads a resume as a new document in the "resumes" collection in the database
function dbUpload(db, file_data, skills_json, file_type, userID) {
  var db_upload = {
    resume: file_data,
    type: file_type,
    skills: skills_json.skills,
    employee: userID,
  };
  return new Promise((resolve, reject) => {
    db.collection('resumes').insertOne(db_upload, function (err, res) {
      if (err) return reject(err);
      console.log(`File inserted into database`);
      console.log(`res.insertedId: ${res.insertedId}`);
      return resolve(res.insertedId);
    });
  });
}

// returns all skills in the skill_assoc collection
function dbGetKeys(db) {
  return new Promise((resolve, reject) => {
    db.collection('skill_assoc')
      .find('name')
      .toArray(function (err, result) {
        if (err) return reject(err);
        return resolve(result);
      });
  });
}

// creates a new document in the skill_assoc collection for each skill that doesn't already have one
function insertNewSkills(db, allCurrentKeys, skills_json) {
  console.log('inserting keys here');
  var newSkills = [];
  for (key in skills_json.skills) {
    // console.log(skills_json.skills[key]);
    if (!allCurrentKeys.includes(skills_json.skills[key])) {
      newSkills.push({ name: skills_json.skills[key], resumes: [] });
    }
  }
  if (newSkills.length > 0) {
    console.log('about to insert all the skills below:');
    console.log(newSkills);

    return new Promise((resolve, reject) => {
      db.collection('skill_assoc').insertMany(newSkills, function (err, res) {
        if (err) return reject(err);
        console.log(`All new skills inserted`);
        return resolve(res);
      });
    });
  } else {
    console.log('No skills to insert');
    return new Promise((resolve, reject) => {
      resolve();
    });
  }
}

// returns file type extension
function getExtFromType(type) {
  if (type == 'application/pdf') return '.pdf';
  if (
    type ==
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return '.docx';
  return null;
}

// update the skill_assoc collection in the database with the new resume
function updateSkillAssoc(db, skills_json, resume_id) {
  console.log('updateMany happening');
  db.collection('skill_assoc').updateMany(
    {
      name: {
        $in: skills_json.skills,
      },
    },
    {
      $push: {
        resumes: resume_id,
      },
    }
  );
}

// pulls a resume document from the database by its _id (ObjectID, not string)
function getResumeByID(db, resume_id) {
  return new Promise((resolve, reject) => {
    db.collection('resumes')
      .find({ _id: resume_id })
      .toArray(function (err, result) {
        if (err) return reject(err);
        if (result.length == 0) return reject(err);
        return resolve(result[0]);
      });
  });
}

// pulls a resume document from the database by its "employee"
function getResumeByEmployee(db, employee_str) {
  return new Promise((resolve, reject) => {
    db.collection('resumes')
      .find({ employee: employee_str })
      .toArray(function (err, result) {
        if (err) return reject(err);
        if (result.length == 0) return reject(err);
        return resolve(result[0]);
      });
  });
}

// pulls a resume from the database and stores it in src/server/resumes
function downloadResumeToServer(db, resume_binary, file_ext, employee) {
  console.log('About to write the pulled resume now');
  var file_path = `${__dirname}/resumes/resume_download${file_ext}`;
  if (employee != '') {
    file_path = `${__dirname}/resumes/${employee.replace(
      ' ',
      '_'
    )}_resume_download${file_ext}`;
  }
  fs.writeFileSync(
    file_path,
    Buffer.from(resume_binary.toString('binary'), 'binary'),
    'binary'
  );
  return file_path;
}

// sends the resume from the given file path on the server to the client as a download
function sendResumeDownloadToClient(file_path, res) {
  res.download(file_path, (err) => {
    if (err) console.error(err);
    return;
  });
}

function sendResumeArrayToClient(resume_list, res) {
  res.json({ resumes: resume_list });
}

// sends the resume file through the parser and sends the JSON of skills back to the client
function parseResume(
  res,
  args,
  db,
  deleteFile,
  allCurrentKeys,
  file_type,
  userID
) {
  var process = child_process.spawn('python3', [
    path.join('utils', 'parser', 'resumeParser.py'),
    ...args,
  ]);

  console.log('Resume being parsed - awaiting results');

  // These are just here to help to ensure the parser is running, logs the byte stream
  process.stdout.on('data', (data) => console.log('stdout: ', data));
  process.stderr.on('data', (data) => console.log('stderr: ', data));

  // On parser termination
  process.on('exit', () => {
    // Read skills json file generated by parser
    fs.readFile(args[0] + '.json', (err, data) => {
      if (err) console.error(err);
      else {
        const skills = JSON.parse(data);
        if (skills.length == 0) {
          res.send(
            'No skills were found in the uploaded resume. Resume not saved.'
          );
          return;
        }

        // Shape the skills into proper JSON format for func
        const skills_json = {
          skills: skills,
        };

        // Send the parsed skills
        res.json(skills_json);
        var file_data = fs.readFileSync(args[0]);
        dbUpload(db, file_data, skills_json, file_type, userID).then(
          (resume_id) => {
            console.log(resume_id);

            insertNewSkills(db, allCurrentKeys, skills_json)
              .then(function () {
                console.log(
                  'Insert skills promise resolved - about to update skills'
                );
                updateSkillAssoc(db, skills_json, resume_id);
              })
              .catch((err) => {
                console.log(err);
              });

            return resume_id;
          }
        );

        if (deleteFile) {
          console.log(`Now deleting - "${args[0]}"`);
          fs.unlink(args[0], (err) => {
            console.error(err);
          });
        }
        fs.unlink(args[0] + '.json', (err) => {
          console.error(err);
        });
      }
    });
  });
}
