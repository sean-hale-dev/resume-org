import React, { Component } from 'react';
import Header from './shared/header.js';
import {DropzoneArea} from 'material-ui-dropzone';
import PageBody from './shared/pagebody.js';
import { Button, Card } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles'
import './styles/resume.css';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';

const styles = theme => ({
  resumeUploadCard: {
    padding: "20px 25%",
  },
  dropzoneText: {
    padding: "0 20px",
  },
});

class Resume extends Component {

  constructor(props) {
    super(props);
    this.state = {resumeFile: undefined, skills: undefined};
  }

  setResume (file) {
    if(file != undefined) {
      console.log("Set Success - Initial file: ", this.state.resumeFile);
      this.state.resumeFile = file;
      console.log("Set Success - Uploaded file: ", this.state.resumeFile);
    }
    else {
      console.log("Set Fail - No file yet");
      this.state.resumeFile = undefined;
    }
  }
  
  uploadResume () {
    if(this.state.resumeFile != undefined) {
      console.log("Upload Success- Will post the file: ", this.state.resumeFile);
      var formData = new FormData();
      formData.append("resume", this.state.resumeFile);
      axios.post(`http://localhost:8080/resume-upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
        .then(res => {
          this.state.skills = res.data;
          console.log("skills: ", this.state.skills);
      })
    }
    else {
      console.log("Upload Fail - File not defined");
    }
  }

  render () {
    const { classes } = this.props;
    return (<>
      <Header selectedPage="Your Resume" />
      <PageBody>
        <Card className={classes.resumeUploadCard}>
          <DropzoneArea
            dropzoneText="Upload Resume"
            acceptedFiles={[".pdf", ".doc", ".docx"]}
            dropzoneParagraphClass={classes.dropzoneText}
            filesLimit={1}
            showPreviews={true}
            showPreviewsInDropzone={false}
            useChipsForPreview
            onChange={(files) => this.setResume(files[0])}
          />
          <Button onClick={() => this.uploadResume()}>Submit resume</Button>
        </Card>
      </PageBody>
    </>);
  }
}

export default withStyles(styles)(Resume);