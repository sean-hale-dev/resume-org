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
  
  app.listen(port, () => {
    console.log(`Listening on *:${port}`);
  });
});

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
