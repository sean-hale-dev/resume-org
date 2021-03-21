const express = require('express');
const app = express();
const port = 3000;

app.post('/resume-upload', (req, res) => {
  // filepath : specifies the document's filepath
  
  var spawn = require("child_process").spawn;
  var process = spawn('resumeParser', [req.query.filepath]);
  
  process.stdout.on('data', function(data) {
    console.log(`data.toString() - ${data.toString()}`);
    if(data.toString().charCodeAt(0) != 27)
    {
      var skills_json = data.toString().split(" skills:\n")[1];
      
      // make the string valid JSON
      skills_json = [skills_json.slice(0, 1), "\"skills\": [", skills_json.slice(1)].join('');
      skills_json = [skills_json.slice(0, -2), "]", skills_json.slice(-2)].join('');
      skills_json = skills_json.replace(/'/g, "\"");
      
      console.log(skills_json);
      res.json(JSON.parse(skills_json));
    }
  });
});

app.listen(port, () => {
	console.log(`Listening on *:${port}`);
});
