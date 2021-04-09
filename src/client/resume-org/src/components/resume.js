import React, { Component } from 'react';
import Header from './shared/header.js';
import {DropzoneArea} from 'material-ui-dropzone';
import PageBody from './shared/pagebody.js';
import { Button, IconButton, Card, Typography, Grid, TextField, InputAdornment, FormControl, OutlinedInput, Toolbar } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles'
import './styles/resume.css';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';
import EditIcon from '@material-ui/icons/Edit';
import CancelIcon from '@material-ui/icons/Cancel';
import SaveIcon from '@material-ui/icons/Save';
import AddIcon from '@material-ui/icons/Add';

const styles = theme => ({
  resumeUploadCard: {
    padding: "20px 25%",
  },
  dropzoneText: {
    padding: "0 20px",
  },
  skillField: {
    margin: "10px",
  },
});

class Resume extends Component {

  constructor(props) {
    super(props);
    this.state = {resumeFile: undefined, skills: undefined, isEditing: false, editedSkills: undefined};
  }

  componentDidMount() {
    const {userID} = this.props;
    if (!userID) return;
    axios.post(`http://${window.location.hostname}:8080/getResumeSkills`, {userID}).then(res => {
      if (res && res.data && res.data.skills) {
        this.setState({skills: res.data.skills});
      }
    });
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
      axios.post(`http://${window.location.hostname}:8080/resume-upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
        .then(res => {
          // this.state.skills = res.data;
          this.setState({skills: res.data});
          console.log("skills: ", this.state.skills);
      })
    }
    else {
      console.log("Upload Fail - File not defined");
    }
  }

  openEdit() {
    const { skills } = this.state;
    this.setState({
      isEditing: true,
      editedSkills: skills ? skills.map(skill => skill) : [],
    })
  }

  onSkillEdit(index, newValue) {
    const {editedSkills} = this.state;
    editedSkills[index] = newValue;
    this.setState({editedSkills});
  }

  onSkillAdd() {
    const {editedSkills} = this.state;
    editedSkills.push("")
    this.setState({editedSkills});
  }

  onSkillDelete(index) {
    const {editedSkills} = this.state;
    editedSkills.splice(index, 1);
    this.setState({editedSkills});
  }

  cancelEditing() {
    const { skills } = this.state;
    this.setState({
      isEditing: false,
      editedSkills: skills ? skills.map(skill => skill) : [],
    });
  }

  saveEdits() {
    const {editedSkills} = this.state;
    const {userID} = this.props;
    // TODO: Send data to server
    axios.post(`http://${window.location.hostname}:8080/updateResumeSkills`, {
      userID,
      skills: [...(new Set(editedSkills ? editedSkills.filter(skill => skill) : []))],
    });
    this.setState({
      isEditing: false,
      skills: editedSkills ? editedSkills.map(skill => skill) : [],
    });
  }

  render () {
    const { classes, userID } = this.props;
    const { skills, editedSkills, isEditing } = this.state;
    // For comparing skills only
    const filteredSkillsSet = new Set(skills ? skills.filter(skill => skill) : []);
    const filteredEditedSkillsSet = new Set(editedSkills ? editedSkills.filter(skill => skill) : []);

    const haveSkillsChanged = !(filteredSkillsSet.size == filteredEditedSkillsSet.size && 
        [...filteredSkillsSet].reduce(
        (allSkillsMatch, skill) => allSkillsMatch && filteredSkillsSet.has(skill) && filteredEditedSkillsSet.has(skill),
        true));
    // console.log(editedSkills);
    return (<>
      <Header selectedPage="Your Resume" userID={userID}/>
      <PageBody>
        {skills && skills.length > 0 && <Card>
          <Typography variant="h5" align="center">What we've parsed:</Typography>
          <Typography variant="h6">
            Skills: 
          </Typography>
          <Grid container alignItems="center">
            {isEditing ? <>
            {editedSkills.map((skill, index) => 
              <Grid item xs={4}>
                <FormControl>
                  <OutlinedInput
                    value={skill}
                    // InputLabelProps={{shrink: (newProfileDetails[field] ? true : false)}}
                    className={classes.skillField}
                    onChange={event => {this.onSkillEdit(index, event.target.value)}}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => this.onSkillDelete(index)}
                          edge="end"
                        >
                          <CancelIcon />
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </Grid>
            )}
            <Grid item xs={3}>
              <Button variant="contained" color="primary" className={classes.skillField} onClick={() => this.onSkillAdd()}>
                Add Skill <AddIcon style={{marginLeft: "10px"}}/>
              </Button>
            </Grid>
            </> : skills.map(skill =>  
              <Grid item xs={3}>
                <Typography 
                // align="center"
                >{skill}</Typography>
              </Grid>
            )}
          </Grid>
          <Toolbar style={{justifyContent: "flex-end"}}>
            {isEditing ? 
              <>
                <Button variant="contained" color="primary" onClick={() => {this.cancelEditing()}}>
                  Cancel <CancelIcon style={{marginLeft: "10px"}}/>
                </Button>
                <Button variant="contained" color="primary" style={{marginLeft: "10px"}} disabled={!haveSkillsChanged} onClick={() => {this.saveEdits()}}>
                  Save <SaveIcon style={{marginLeft: "10px"}}/>
                </Button>
              </> 
            : 
              <Button variant="contained" color="primary" onClick={() => {this.openEdit()}}>
                Edit <EditIcon style={{marginLeft: "10px"}}/>
              </Button>
            }
          </Toolbar>
        </Card>}
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