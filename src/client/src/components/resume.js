import React, { Component } from 'react';
import Header from './shared/header.js';
import { DropzoneArea } from 'material-ui-dropzone';
import PageBody from './shared/pagebody.js';
import {
  Button,
  IconButton,
  Dialog,
  DialogContent,
  Box,
  Card,
  Typography,
  Grid,
  InputAdornment,
  FormControl,
  OutlinedInput,
  Toolbar,
  Snackbar,
  Grow,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import './styles/resume.css';
import axios from 'axios';
import EditIcon from '@material-ui/icons/Edit';
import CancelIcon from '@material-ui/icons/Cancel';
import SaveIcon from '@material-ui/icons/Save';
import AddIcon from '@material-ui/icons/Add';
import MuiAlert from '@material-ui/lab/Alert';
import CloseIcon from '@material-ui/icons/Close';

import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';

const styles = (theme) => ({
  resumeUploadCard: {
    padding: '20px 25%',
  },
  dropzoneText: {
    padding: '0 20px',
  },
  skillField: {
    margin: '10px',
  },
  skillTypography: {
    padding: '0 20px',
  },
});

class Resume extends Component {
  constructor(props) {
    super(props);
    this.state = {
      resumeFile: undefined,
      skills: undefined,
      isEditing: false,
      editedSkills: undefined,
      openSnackBar: false,
      typeSnackBar: 'loading',
      resumeDialogOpen: false,
      resumeDialogTarget: '',
    };
  }

  componentDidMount() {
    const { userID } = this.props;
    if (!userID) return;
    axios
      .post(`http://${window.location.hostname}:8080/api/getResumeSkills`, {
        userID,
      })
      .then((res) => {
        if (res && res.data && res.data.skills) {
          this.setState({ skills: res.data.skills.sort() });
        }
      });
  }

  openResumeDialog = (employeeID) => {
    this.setState({
      resumeDialogOpen: true,
      resumeDialogTarget: employeeID,
    });
  };

  closeResumeDialog = () => {
    this.setState({
      resumeDialogOpen: false,
      resumeDialogTarget: '',
    });
  };

  setResume(file) {
    if (file !== undefined) {
      console.log('Set Success - Initial file: ', this.state.resumeFile);
      this.setState({
        resumeFile: file,
      });
      console.log('Set Success - Uploaded file: ', this.state.resumeFile);
    } else {
      console.log('Set Fail - No file yet');
      this.setState({
        resumeFile: undefined,
      });
    }
  }

  uploadResume() {
    if (this.state.resumeFile !== undefined) {
      console.log(
        'Upload Success- Will post the file: ',
        this.state.resumeFile
      );
      this.setState({
        openSnackBar: true,
        typeSnackBar: 'loading',
      });
      var formData = new FormData();
      formData.append('resume', this.state.resumeFile);
      formData.append('userID', this.props.userID);
      axios
        .post(
          `http://${window.location.hostname}:8080/api/resume-upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
        .then((res) => {
          this.setState({
            skills: res.data && res.data.skills ? res.data.skills.sort() : [],
            openSnackBar: true,
            typeSnackBar: 'success',
          });
          console.log('skills: ', this.state.skills);
        })
        .catch((err) => {
          this.setState({
            openSnackBar: true,
            typeSnackBar: 'error',
          });
          console.error(err);
        });
    } else {
      console.log('Upload Fail - File not defined');
    }
  }

  handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    this.setState({ openSnackBar: false });
  };

  openEdit() {
    const { skills } = this.state;
    this.setState({
      isEditing: true,
      editedSkills: skills ? skills.map((skill) => skill) : [],
    });
  }

  onSkillEdit(index, newValue) {
    const { editedSkills } = this.state;
    editedSkills[index] = newValue;
    this.setState({ editedSkills });
  }

  onSkillAdd() {
    const { editedSkills } = this.state;
    editedSkills.push('');
    this.setState({ editedSkills });
  }

  onSkillDelete(index) {
    const { editedSkills } = this.state;
    editedSkills.splice(index, 1);
    this.setState({ editedSkills });
  }

  cancelEditing() {
    const { skills } = this.state;
    this.setState({
      isEditing: false,
      editedSkills: skills ? skills.map((skill) => skill) : [],
    });
  }

  saveEdits() {
    const { editedSkills } = this.state;
    const { userID } = this.props;
    // TODO: Send data to server
    axios.post(
      `http://${window.location.hostname}:8080/api/updateResumeSkills`,
      {
        userID,
        skills: [
          ...new Set(
            editedSkills ? editedSkills.filter((skill) => skill).sort() : []
          ),
        ],
      }
    );
    this.setState({
      isEditing: false,
      skills: editedSkills ? editedSkills.map((skill) => skill).sort() : [],
    });
  }

  render() {
    const { classes, userID } = this.props;
    const { skills, editedSkills, isEditing } = this.state;
    // For comparing skills only
    const filteredSkillsSet = new Set(
      skills ? skills.filter((skill) => skill) : []
    );
    const filteredEditedSkillsSet = new Set(
      editedSkills ? editedSkills.filter((skill) => skill) : []
    );

    const haveSkillsChanged = !(
      filteredSkillsSet.size === filteredEditedSkillsSet.size &&
      [...filteredSkillsSet].reduce(
        (allSkillsMatch, skill) =>
          allSkillsMatch &&
          filteredSkillsSet.has(skill) &&
          filteredEditedSkillsSet.has(skill),
        true
      )
    );
    // console.log(editedSkills);
    return (
      <>
        <Header selectedPage="Your Resume" userID={userID} />
        <PageBody>
          {skills && skills.length > 0 && (
            <Card>
              <Typography variant="h5" align="center">
                What we've parsed:
              </Typography>
              <Typography variant="h6" className={classes.skillTypography}>
                Skills:
              </Typography>
              <Grid container alignItems="center">
                {isEditing ? (
                  <>
                    {editedSkills.map((skill, index) => (
                      <Grid item xs={4}>
                        <FormControl>
                          <OutlinedInput
                            value={skill}
                            // InputLabelProps={{shrink: (newProfileDetails[field] ? true : false)}}
                            className={classes.skillField}
                            onChange={(event) => {
                              this.onSkillEdit(index, event.target.value);
                            }}
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
                    ))}
                    <Grid item xs={3}>
                      <Button
                        variant="contained"
                        color="primary"
                        className={classes.skillField}
                        onClick={() => this.onSkillAdd()}
                      >
                        Add Skill <AddIcon style={{ marginLeft: '10px' }} />
                      </Button>
                    </Grid>
                  </>
                ) : (
                  skills.map((skill) => (
                    <Grid item xs={3}>
                      <Typography className={classes.skillTypography}>
                        {'\u25CF'} {skill}
                      </Typography>
                    </Grid>
                  ))
                )}
              </Grid>
              <Toolbar style={{ justifyContent: 'flex-end' }}>
                {isEditing ? (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        this.cancelEditing();
                      }}
                    >
                      Cancel <CancelIcon style={{ marginLeft: '10px' }} />
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      style={{ marginLeft: '10px' }}
                      disabled={!haveSkillsChanged}
                      onClick={() => {
                        this.saveEdits();
                      }}
                    >
                      Save <SaveIcon style={{ marginLeft: '10px' }} />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      this.openEdit();
                    }}
                  >
                    Edit <EditIcon style={{ marginLeft: '10px' }} />
                  </Button>
                )}
              </Toolbar>
            </Card>
          )}
          <Card className={classes.resumeUploadCard}>
            <DropzoneArea
              dropzoneText="Upload Resume"
              acceptedFiles={['.pdf', '.doc', '.docx']}
              dropzoneParagraphClass={classes.dropzoneText}
              filesLimit={1}
              showPreviews={true}
              showPreviewsInDropzone={false}
              useChipsForPreview
              onChange={(files) => this.setResume(files[0])}
            />
            <br />
            <Grid container justify="space-between">
              <Button
                variant="contained"
                color="primary"
                onClick={() => this.uploadResume()}
              >
                Submit resume
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => this.openResumeDialog(userID)}
              >
                View your resume
              </Button>
            </Grid>
          </Card>
        </PageBody>
        <Grow in={this.state.openSnackBar === true}>
          <Snackbar
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            open={this.state.openSnackBar === true}
            onClose={this.handleSnackbarClose}
          >
            <MuiAlert
              elevation={6}
              variant="filled"
              onClose={this.handleSnackbarClose}
              severity={
                this.state.typeSnackBar === 'loading'
                  ? 'info'
                  : this.state.typeSnackBar === 'error'
                  ? 'error'
                  : this.state.typeSnackBar === 'success'
                  ? 'success'
                  : ''
              }
            >
              {this.state.typeSnackBar === 'loading'
                ? 'Loading...'
                : this.state.typeSnackBar === 'error'
                ? 'There was an error uploading the file.'
                : this.state.typeSnackBar === 'success'
                ? `The file '${this.state.resumeFile.name}' was successfully uploaded.`
                : ''}
            </MuiAlert>
          </Snackbar>
        </Grow>

        <Dialog
          open={this.state.resumeDialogOpen}
          onClose={this.closeResumeDialog}
          aria-labelledby="resume-fileview-dialog"
          fullScreen
        >
          <DialogContent>
            <Box textAlign="right">
              <IconButton onClick={this.closeResumeDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
            <DocViewer
              style={{ minHeight: '100vh' }}
              config={{
                header: {
                  disableHeader: true,
                },
              }}
              pluginRenderers={DocViewerRenderers}
              documents={[
                {
                  uri: `http://${
                    window.location.hostname === 'localhost'
                      ? 'ec2-54-91-125-216.compute-1.amazonaws.com'
                      : window.location.hostname
                  }/api/resume-download?employee=${
                    this.state.resumeDialogTarget
                  }`,
                },
              ]}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }
}

export default withStyles(styles)(Resume);
