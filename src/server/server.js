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


// TODO: ADD AUTHENTICATION

mongo_client.connect(process.env.MONGO_URI, function(err, database) {
  if (err) throw err;
  
  var db = database.db("resume_org");
  
  console.log("Connected with MongoDB!");
  
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
    form.parse(req);
  
    form.on('fileBegin', function (name, file) {
      file.path = `${__dirname}/resumes/${file.name}`;
    });
  
    form.on('file', function (name, file) {
      console.log(`File uploaded - "${file.path}"`);
      
      dbGetKeys(db).then(result => {
        console.log("Get keys - promise done:");
        allCurrentKeys = result.map(doc => doc.name);
        console.log(allCurrentKeys);
        parseResume(res, [file.path], db, true, allCurrentKeys, file.type);
      });
      
    });
  });

  app.post('/resume-search', (req, res) => {
    console.log("Searching");
    const queryString = req.body.queryString || " (c | c) ";
    resumeSearch(queryString, db, res);
  })
  
  app.get('/resume-download', (req, res) => {
    // file path hard-coded for testing purposes
    if(req.query.type == "pdf") {
      sendResumeDownloadToClient(`${__dirname}/resumes/testfilelocation.pdf`, res);      
    }
    else if(req.query.type == "docx") {
      sendResumeDownloadToClient(`${__dirname}/resumes/testfilelocation.docx`, res);
    }
    else {
      res.send("Incompatible file type.");
    }
  });

  app.post('/login', (req, res) => {
    const {userID} = req.body;
    console.log(`Logging in ${userID}`);
    handleLogin(userID, db, res);
  }); 

  app.post('/getProfile', (req, res) => {
    const {userID} = req.body;
    getProfile(userID, db, res);
  })

  app.post('/updateProfile', (req, res) => {
    const {userID, details} = req.body;
    updateProfile(userID, details, db, res);
  })

  app.post('/getResumeSkills', (req, res) => {
    const {userID} = req.body;
    getResumeSkillsByUserID(userID, db, res);
  })

  app.post('/updateResumeSkills', (req, res) => {
    const {userID, skills} = req.body;
    updateResumeSkillsByUserID(userID, skills, db, res);
  })
  
  app.listen(port, () => {
    console.log(`Listening on *:${port}`);
  });
});

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
  const regExpMacro = /\$\d*\$/;
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
  db.collection("employees").findOne({userID}).then(employee => {
    if (employee && employee.resume) {
      db.collection("resumes").findOne({_id: employee.resume}).then(resume => {
        if (resume && resume.skills) {
          res.json({skills: resume.skills});
        } else {
          res.json({skills: []});
        }
      })
    } else {
      res.json({skills: []});
    }
  })
}

// Update resume skills
function updateResumeSkillsByUserID(userID, skills, db, res) {
  // Filter skills to ensure no duplicates
  skills = (skills && Array.isArray(skills)) ? skills.filter(skill => skill).map(skill => `${skill}`) : [];
  db.collection("employees").findOne({userID}).then(employee => {
    if (employee && employee.resume) {
      db.collection("resumes").updateOne({_id: employee.resume}, {
        $set: {skills}
      }).then(() => {
        getResumeSkillsByUserID(userID, db, res)
      })
    } else {
      getResumeSkillsByUserID(userID, db, res);
    }
  })
}

// Handle user login
function handleLogin(userID, db, res) {
  db.collection("employees").findOne({userID}).then(employee => {
    if (employee) {
      res.json(employee);
    } else {
      db.collection("employees").insertOne({userID}).then(() => res.json({userID}));
    }
  })
}

function getProfile(userID, db, res) {
  db.collection("employees").findOne({userID}).then(employee => {
    employeeData = {
      userID,
      position: employee.position || "",
      name: employee.name || "",
      yearsExperience: employee.yearsExperience || false,
    };
    res.json(employeeData)
  });
}

// TODO: This should *definitely* have authentication
function updateProfile(userID, details, db, res) {
  const updates = {};
  if (details.name !== undefined) updates.name = details.name;
  if (details.position  !== undefined) updates.position = details.position;
  if (details.yearsExperience  !== undefined) updates.yearsExperience = details.yearsExperience;
  db.collection("employees").updateOne({userID}, {
    $set: updates,
  }).then(() => getProfile(userID, db, res));
}

// Searches for resumes matching queryString
function resumeSearch(searchString, db, res) {
  const validation = validateSearchQuery(searchString);
  if (!validation.good) {
    console.log(`Search validation errors: ${validation.issues.join(", ")}`);
    res.json([]);
    return;
  }
  search.search(searchString).then(resumeIDSet => {
    if (resumeIDSet.status == -1) {
      console.log(`${searchString} issue: ${resumeIDSet.message}`);
      res.json([]);
      return;
    }
    const resumeGetPromises = [...resumeIDSet.payload].map(id => db.collection("resumes").findOne({_id: id}));
    
    Promise.all(resumeGetPromises).then(resumes => {
      const resumeData = resumes.map(resume => ({
        _id: (resume && resume._id) || false,
        type: (resume && resume.type) || false,
        skills: (resume && resume.skills) || [],
        employee: (resume && resume.employee) || false,
        experience: (resume && resume.yearsExperience) || false,
        position: (resume && resume.position) || false,
      }));
      res.json(resumeData);
    })
  })
}

// uploads a resume as a new document in the "resumes" collection in the database
function dbUpload(db, file_data, skills_json, file_type) {
  var db_upload = { resume: file_data, type: file_type, skills: skills_json.skills, employee: "Test Employee"};
  return new Promise((resolve, reject) => {
    db.collection("resumes").insertOne(db_upload, function(err, res) {
      if (err) return reject(err);
      console.log(`File inserted into database`);
      console.log(`res.insertedId: ${res.insertedId}`);
      return resolve(res.insertedId);
    })
 });
}

// returns all skills in the skill_assoc collection
function dbGetKeys(db) {
  return new Promise((resolve, reject) => {
    db.collection("skill_assoc").find("name").toArray( function(err, result) {
      if (err) return reject(err);
      return resolve(result);
    })
  });
}

function insertNewSkills(db, allCurrentKeys, skills_json) {
  console.log("inserting keys here");
  var newSkills = [];
  for(key in skills_json.skills) {
    // console.log(skills_json.skills[key]);
    if(!allCurrentKeys.includes(skills_json.skills[key])) {
      newSkills.push({name: skills_json.skills[key], resumes: []});
    }
  }
  if(newSkills.length > 0) {
    console.log("about to insert all the skills below:");
    console.log(newSkills);
    
    return new Promise((resolve, reject) => {
      db.collection("skill_assoc").insertMany(newSkills, function(err, res) {
        if (err) return reject(err);
        console.log(`All new skills inserted`);
        return resolve(res)
      });
    });
  }
  else {
    console.log("No skills to insert");
    return new Promise((resolve, reject) => {
      resolve();
    });
  }
}

// returns file type extension
function getExtFromType(type) {
  if(type == "application/pdf") return ".pdf";
  if(type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  return null;
}

// update the skill_assoc collection in the database with the new resume
function updateSkillAssoc(db, skills_json, resume_id) {
  console.log("updateMany happening");
  db.collection("skill_assoc").updateMany({
    name: {
      $in: skills_json.skills
    }
  }, {
    $push: {
      resumes: resume_id
    }
  });
}

// pulls a resume document from the database by its _id
function getResume(db, resume_id) {
  return new Promise((resolve, reject) => {
    db.collection("resumes").find({_id: resume_id}).toArray( function(err, result) {
      if (err) return reject(err);
      if (result.length == 0) return reject(err);
      return resolve(result[0]);
    })
  });
}

// pulls a resume from the database and stores it in src/server/resumes
function downloadResumeToServer(db, resume_binary, file_ext) {
  console.log("About to write the pulled resume now");
  fs.writeFileSync(`${__dirname}/resumes/testfilelocation${file_ext}`, Buffer.from(resume_binary.toString("binary"), "binary"), "binary");
}

// sends the resume from the given file path on the server to the client as a download
function sendResumeDownloadToClient(file_path, res) {
  res.download(file_path, (err) => {
    console.log(err);
  });
}

function sendResumeArrayToClient(resume_list, res) {
  res.json({resumes: resume_list});
}

function parseResume(res, args, db, deleteFile, allCurrentKeys, file_type) {
  var process = child_process.spawn('resumeParser', args);

  console.log('Resume being parsed - awaiting results');
  process.stdout.on('data', function (data) {
    console.log(`data.toString(): ${data.toString()}`);
    if((data.toString().includes(" 0 skills"))) {
      res.send("No skills were found in the uploaded resume. Resume not saved.");
    }
    if (data.toString().charCodeAt(0) != 27) {
      var skills_json = data.toString().split(' skills:\n')[1];

      // make the string valid JSON
      skills_json = [
        skills_json.slice(0, 1),
        '"skills": [',
        skills_json.slice(1),
      ].join('');
      skills_json = [skills_json.slice(0, -2), ']', skills_json.slice(-2)].join('');
      skills_json = skills_json.replace(/'/g, '"');

      console.log("skills_json: " + skills_json);
      
      skills_json = JSON.parse(skills_json);
      
      // send the JSON of skills back to the client
      res.json(skills_json);
      
      // upload file and skills to database
      var file_data = fs.readFileSync(args[0]);
      dbUpload(db, file_data, skills_json, file_type).then(resume_id => {
        console.log(resume_id);
        
        insertNewSkills(db, allCurrentKeys, skills_json).then(function() {
          console.log("Insert skills promise resolved - about to update skills")
          updateSkillAssoc(db, skills_json, resume_id);
        }).catch(err => {
          console.log(err);
        });
        
        return resume_id;
      })
      /* this then() gets the resume back and downloads it to the server
      .then(resume_id => {
        getResume(db, resume_id).then(resume => {
          downloadResumeToServer(db, resume.resume, getExtFromType(resume.type));
          console.log(`File redownloaded to server from database`);
          
          // sendResumeDownloadToClient(`${__dirname}/resumes/testfilelocation${getExtFromType(resume.type)}`, res);
        }).catch(() => {
          console.log(`No resume found with _id = ${resume_id}`)
        });
      });
      */
     
      if (deleteFile) {
        console.log(`Now deleting - "${args[0]}"`);
        fs.unlinkSync(args[0]);
      }
    }
  });
}
