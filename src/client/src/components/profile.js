import React, { Component } from 'react';
import Header from './shared/header.js';
import PageBody from './shared/pagebody.js';
import {
  Button,
  Card,
  Typography,
  TextField,
  Toolbar,
  Grid,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import axios from 'axios';
import EditIcon from '@material-ui/icons/Edit';
import CancelIcon from '@material-ui/icons/Cancel';
import SaveIcon from '@material-ui/icons/Save';

const styles = (theme) => ({
  profileField: {
    width: '75%',
  },
  profileToolbar: {
    padding: '20px',
  },
});

const formFields = {
  name: { text: 'Name' },
  position: { text: 'Position' },
  yearsExperience: { text: 'Years of Experience', type: 'number' },
};

/**
 * Props:
 * @param {String} userID userID string
 * @param {Object} clientPermissions Object containing list of links that client has access to
 */
class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      originalProfileDetails: {},
      newProfileDetails: {},
      isEditing: false,
    };
  }

  componentDidMount() {
    const { userID } = this.props;
    axios
      .post(`http://${window.location.hostname}:8080/api/getProfile`, {
        userID,
      })
      .then((res) => {
        this.setState({
          originalProfileDetails: {
            name: res.data.name,
            position: res.data.position,
            yearsExperience: res.data.yearsExperience,
          },
          newProfileDetails: {
            name: res.data.name,
            position: res.data.position,
            yearsExperience: res.data.yearsExperience,
          },
        });
        console.log(`Profile: ${JSON.stringify(res.data)}`);
      });
  }

  /**
   * Update a profile field
   * @param {String} field 
   * @param {String} value 
   */
  onFormFieldChange(field, value) {
    const { newProfileDetails } = this.state;
    newProfileDetails[field] = value;
    this.setState({ newProfileDetails });
  }

  /**
   * Start editing the profile
   */
  startEditing() {
    this.setState({ isEditing: true });
  }

  /**
   * Cancel editing the profile
   */
  cancelEditing() {
    const { originalProfileDetails } = this.state;
    this.setState({
      newProfileDetails: {
        name: originalProfileDetails.name,
        position: originalProfileDetails.position,
        yearsExperience: originalProfileDetails.yearsExperience,
      },
      isEditing: false,
    });
  }

  /**
   * Save edits to the profile and stop editing
   */
  saveEdits() {
    const { userID } = this.props;
    const { newProfileDetails } = this.state;
    axios.post(`http://${window.location.hostname}:8080/api/updateProfile`, {
      userID,
      details: newProfileDetails,
    });
    this.setState({
      originalProfileDetails: {
        name: newProfileDetails.name,
        position: newProfileDetails.position,
        yearsExperience: newProfileDetails.yearsExperience,
      },
      isEditing: false,
    });
  }

  render() {
    const { userID, classes, clientPermissions } = this.props;
    const { originalProfileDetails, newProfileDetails, isEditing } = this.state;
    const hasProfileChanged = Object.keys(formFields).reduce(
      (accumulator, field) => {
        return (
          accumulator ||
          originalProfileDetails[field] !== newProfileDetails[field]
        );
      },
      false
    );
    return (
      <>
        <Header selectedPage="Profile" userID={userID} clientPermissions={clientPermissions} />
        <PageBody>
          <Card style={{ padding: '10px' }}>
            <Typography variant="h6" align="center">
              Currently logged in as {userID}.
            </Typography>
            {Object.entries(formFields).map(([field, details]) => (
              <Toolbar>
                <Grid container justify="space-between" alignItems="center">
                  {isEditing ? (
                    <TextField
                      label={details.text}
                      variant="outlined"
                      type={details.type || 'text'}
                      value={newProfileDetails[field]}
                      InputLabelProps={{
                        shrink: newProfileDetails[field] ? true : false,
                      }}
                      className={classes.profileField}
                      onChange={(event) => {
                        this.onFormFieldChange(field, event.target.value);
                      }}
                    />
                  ) : (
                    <Typography>
                      {details.text}: {originalProfileDetails[field]}
                    </Typography>
                  )}
                </Grid>
              </Toolbar>
            ))}
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
                    disabled={!hasProfileChanged}
                    onClick={() => {
                      this.saveEdits();
                    }}
                  >
                    Save <SaveIcon style={{ marginLeft: '10px' }} />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      this.startEditing();
                    }}
                  >
                    Edit <EditIcon style={{ marginLeft: '10px' }} />
                  </Button>
                </>
              )}
            </Toolbar>
          </Card>
        </PageBody>
      </>
    );
  }
}

export default withStyles(styles)(Profile);
