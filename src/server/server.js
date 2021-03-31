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
      
      var prom = dbGetKeys(db);
      prom.then(result => {
        console.log("Get keys - promise done:");
        allCurrentKeys = result.map(doc => doc.name);
        console.log(allCurrentKeys);
        parseResume(res, [file.path], db, true, allCurrentKeys);
      });
      
    });
  });
  
  app.listen(port, () => {
    console.log(`Listening on *:${port}`);
  });
});

function dbUpload(db, file_data, skills_json) {
  var db_upload = { resume: file_data, skills: skills_json.skills};
  return new Promise((resolve, reject) => {
    db.collection("resumes").insertOne(db_upload, function(err, res) {
      if (err) return reject(err);
      console.log(`File inserted into database`);
      console.log(`res.insertedId: ${res.insertedId}`);
      return resolve(res.insertedId);
    })
 });
}

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
    console.log(skills_json.skills[key]);
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

function parseResume(res, args, db, deleteFile, allCurrentKeys) {
  var process = child_process.spawn('resumeParser', args);

  console.log('Resume being parsed - awaiting results');
  process.stdout.on('data', function (data) {
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
      dbUpload(db, file_data, skills_json).then(resume_id => {
        console.log(resume_id);
        insertNewSkills(db, allCurrentKeys, skills_json).then(function() {
          console.log("Insert skills promise resolved - about to update skills")
          updateSkillAssoc(db, skills_json, resume_id);
        });
      })
      
      if (deleteFile) {
        console.log(`Now deleting - "${args[0]}"`);
        fs.unlinkSync(args[0]);
      }
    }
  });
}
