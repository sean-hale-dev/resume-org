const express = require('express');
const app = express();
const port = 8080;
const bodyParser = require('body-parser');
const fs = require('fs');
const formidable = require('formidable');
const child_process = require('child_process');

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
    parseResume(res, [file.path], true);
  });
});

app.listen(port, () => {
  console.log(`Listening on *:${port}`);
});

function parseResume(res, args, deleteFile) {
  var process = child_process.spawn('resumeParser', args);

  console.log('Resume being parsed - awaiting results');
  process.stdout.on('data', function (data) {
    if (data.toString().charCodeAt(0) != 27) {
      if (deleteFile) {
        console.log(`Now deleting - "${args[0]}"`);
        fs.unlinkSync(args[0]);
      }
      var skills_json = data.toString().split(' skills:\n')[1];

      // make the string valid JSON
      skills_json = [
        skills_json.slice(0, 1),
        '"skills": [',
        skills_json.slice(1),
      ].join('');
      skills_json = [skills_json.slice(0, -2), ']', skills_json.slice(-2)].join(
        ''
      );
      skills_json = skills_json.replace(/'/g, '"');

      console.log(skills_json);
      res.json(JSON.parse(skills_json));
    }
  });
}
