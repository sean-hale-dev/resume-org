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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import axios from 'axios';
import EditIcon from '@material-ui/icons/Edit';
import CancelIcon from '@material-ui/icons/Cancel';
import SaveIcon from '@material-ui/icons/Save';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import { grey } from '@material-ui/core/colors';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

const styles = (theme) => ({
  profileField: {
    padding: '10px',
    width: '100%',
  },
  profileToolbar: {
    padding: '20px',
  },
  resultsSortBy: {
    alignSelf: 'center',
    width: '90%',
    margin: '10px',
  },
  resultsTypography: {
    alignSelf: 'center',
    padding: '0 20px',
  },
  resultsCard: {
    backgroundColor: grey[100],
  },
});

const USER_FIELDS = {
  userID: 'User ID',
  name: 'Name',
  position: 'Position',
  yearsExperience: 'Years of Experience',
  role: 'Role',
};

const USER_FIELD_EDIT_STYLES = {
  userID: 'text',
  name: 'text',
  position: 'text',
  yearsExperience: 'number',
  role: 'role',
};

const PERMISSION_LEVELS = {
  Employee: 1,
  Manager: 2,
  Admin: 3,
};

function copyUser(user) {
  const copy = {};
  Object.entries(user).forEach(([field, value]) => {
    copy[field] = value;
  });
  return copy;
}

const stringCompare = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

function hasUserDataChanged(user) {
  const { userData, editedUserData } = user;
  return Object.keys(USER_FIELDS).reduce(
    (accumulator, field) =>
      accumulator || userData[field] !== editedUserData[field],
    false
  );
}

class Admin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
    };
    this.startEditing.bind(this);
    this.cancelEditing.bind(this);
    this.saveEdits.bind(this);
    this.cancelWarningDialog.bind(this);
    this.openWarningDialog.bind(this);
    this.acceptWarningDialog.bind(this);
  }

  componentDidMount() {
    const { userID } = this.props;
    console.log('Component mounted');
    axios
      .post(`http://${window.location.hostname}:8080/adminGetProfiles`, {
        userID,
      })
      .then((res) => {
        console.log(res);
        this.setState({
          users: res.data.map((user, index) => ({
            index,
            editing: false,
            userData: copyUser(user),
            editedUserData: copyUser(user),
          })),
        });
      });
  }

  startEditing(user) {
    const { users } = this.state;
    user.isEditing = true;
    this.setState({ users });
  }

  cancelEditing(user) {
    const { users } = this.state;
    user.isEditing = false;
    user.editedUserData = copyUser(user.userData);
    this.setState({ users });
  }

  saveEdits(user) {
    const { userID, cookies } = this.props;
    const { users } = this.state;
    const { isEditing, userData, editedUserData } = user;
    if (!isEditing) return;
    const updates = {};
    Object.keys(USER_FIELDS).map((field) => {
      if (userData[field] !== editedUserData[field]) {
        updates[field] = editedUserData[field];
      }
      return null;
    });
    const acceptFunction = () => {
      console.log(
        `Sending updates to server for ${userData.userID}: ${JSON.stringify(
          updates
        )}`
      );
      axios
        .post(`http://${window.location.hostname}:8080/adminUpdateProfile`, {
          userID,
          targetUserID: userData.userID,
          updates,
        })
        .then((res) => {
          if (userData.userID === userID && updates.userID) {
            cookies.set('userID', updates.userID);
          }
          user.userData = copyUser(editedUserData);
          user.isEditing = false;
          this.setState({ users });
        });
    };
    if (
      userData.userID === userID &&
      updates.role &&
      updates.role !== 'Admin'
    ) {
      this.openWarningDialog(
        'Are you sure you want to remove your own admin permissions?',
        `This edit to user ${userData.userID} removes your own administrator permissions. This will prevent you from making further edits. Are you sure you want to do this?`,
        acceptFunction
      );
    } else {
      acceptFunction();
    }
  }

  deleteUser(user, index) {
    const { userID } = this.props;
    const { users } = this.state;
    this.openWarningDialog(
      'Are you sure you want to delete this user?',
      `User deletion cannot be undone! Are you sure you want to remove ${user.userData.userID} from the organization?`,
      () => {
        axios.post(
          `http://${window.location.hostname}:8080/adminDeleteProfile`,
          { userID, targetUserID: user.userData.userID }
        );
        users.splice(index, 1);
        this.setState({ users });
      }
    );
  }

  openWarningDialog(warningTitle, warningText, acceptFunction) {
    this.setState({
      warning: { warningTitle, warningText, acceptFunction },
    });
  }

  cancelWarningDialog() {
    this.setState({ warning: false });
  }

  acceptWarningDialog() {
    const { warning } = this.state;
    if (warning && warning.acceptFunction) warning.acceptFunction();
    this.setState({ warning: false });
  }

  render() {
    const { userID, classes, clientPermissions } = this.props;
    const { users, warning } = this.state;
    console.log(users);

    const sortOptions = {
      '----': () => {
        users.sort((a, b) => a.index - b.index);
        this.setState({ users });
      },
      'Name (A-Z)': () => {
        users.sort((a, b) => stringCompare(a.userData.name, b.userData.name));
        this.setState({ users });
      },
      'Position (A-Z)': () => {
        users.sort((a, b) =>
          stringCompare(a.userData.position, b.userData.position)
        );
        this.setState({ users });
      },
      'Most Experience': () => {
        users.sort(
          (a, b) =>
            (b.userData.yearsExperience || 0) -
            (a.userData.yearsExperience || 0)
        );
        this.setState({ users });
      },
      'Least Experience': () => {
        users.sort(
          (a, b) =>
            (a.userData.yearsExperience || 0) -
            (b.userData.yearsExperience || 0)
        );
        this.setState({ users });
      },
      'Most Permissions': () => {
        users.sort(
          (a, b) =>
            (PERMISSION_LEVELS[b.userData.role] || 0) -
            (PERMISSION_LEVELS[a.userData.role] || 0)
        );
        this.setState({ users });
      },
      'Least Permissions': () => {
        users.sort(
          (a, b) =>
            (PERMISSION_LEVELS[a.userData.role] || 0) -
            (PERMISSION_LEVELS[b.userData.role] || 0)
        );
        this.setState({ users });
      },
    };

    return (
      <>
        {warning && (
          <Dialog
            open={warning}
            onClose={() => {
              this.cancelWarningDialog();
            }}
          >
            <DialogTitle>{warning.warningTitle}</DialogTitle>
            <DialogContent>
              <DialogContentText>{warning.warningText}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  this.cancelWarningDialog();
                }}
              >
                Cancel <CancelIcon style={{ marginLeft: '10px' }} />
              </Button>
              <Button
                variant="contained"
                color="primary"
                style={{ marginLeft: '10px' }}
                onClick={() => {
                  this.acceptWarningDialog();
                }}
              >
                Continue <SaveIcon style={{ marginLeft: '10px' }} />
              </Button>
            </DialogActions>
          </Dialog>
        )}
        <Header
          selectedPage="Admin Dashboard"
          userID={userID}
          clientPermissions={clientPermissions}
        />
        <PageBody>
          <Card className={classes.resultsCard}>
            <Grid container alignItems="center">
              <Grid item xs={8}>
                <Typography variant="h6" className={classes.resultsTypography}>
                  Users in Organization
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <FormControl className={classes.resultsSortBy}>
                  <InputLabel id="results-sort-label">Sort by:</InputLabel>
                  <Select
                    labelId="results-sort-label"
                    id="results-sort"
                    onChange={(event) => sortOptions[event.target.value]()}
                  >
                    {Object.keys(sortOptions).map((sortOption) => (
                      <MenuItem value={sortOption}>{sortOption}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            {users.map((user, rawIndex) => (
              <Card style={{ padding: '10px' }}>
                <Grid container alignItems="center">
                  <Grid item xs={6}>
                    {Object.entries(USER_FIELDS).map(([field, value]) => (
                      <Toolbar style={{ padding: '0px', minHeight: '0px' }}>
                        {user.isEditing &&
                        !(
                          field === 'role' && user.userData.userID === userID
                        ) ? (
                          {
                            text: (
                              <TextField
                                label={value}
                                variant="outlined"
                                type={'text'}
                                value={user.editedUserData[field]}
                                InputLabelProps={{
                                  shrink: user.editedUserData[field]
                                    ? true
                                    : false,
                                }}
                                className={classes.profileField}
                                onChange={(event) => {
                                  // this.onFormFieldChange(field, event.target.value)
                                  user.editedUserData[field] =
                                    event.target.value;
                                  this.setState({ users });
                                }}
                              />
                            ),
                            number: (
                              <TextField
                                label={value}
                                variant="outlined"
                                type={'number'}
                                value={user.editedUserData[field]}
                                InputLabelProps={{
                                  shrink: user.editedUserData[field]
                                    ? true
                                    : false,
                                }}
                                className={classes.profileField}
                                onChange={(event) => {
                                  // this.onFormFieldChange(field, event.target.value)
                                  user.editedUserData[field] =
                                    event.target.value;
                                  this.setState({ users });
                                }}
                              />
                            ),
                            role: (
                              <FormControl className={classes.resultsSortBy}>
                                <InputLabel id="results-sort-label">
                                  Role
                                </InputLabel>
                                <Select
                                  value={user.editedUserData[field]}
                                  labelId="results-sort-label"
                                  id="results-sort"
                                  onChange={(event) => {
                                    // sortOptions[event.target.value]()
                                    user.editedUserData[field] =
                                      event.target.value;
                                    this.setState({ users });
                                  }}
                                >
                                  {Object.keys(PERMISSION_LEVELS).map(
                                    (permissionLevel) => (
                                      <MenuItem value={permissionLevel}>
                                        {permissionLevel}
                                      </MenuItem>
                                    )
                                  )}
                                </Select>
                              </FormControl>
                            ),
                          }[USER_FIELD_EDIT_STYLES[field]]
                        ) : (
                          <Typography>
                            {value}: {user.userData[field] || ''}
                          </Typography>
                        )}
                      </Toolbar>
                    ))}
                  </Grid>
                  <Grid item xs={6}>
                    <Toolbar
                      style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}
                    >
                      {user.isEditing ? (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            style={{ margin: '5px' }}
                            onClick={() => {
                              this.cancelEditing(user);
                            }}
                          >
                            Cancel <CancelIcon style={{ marginLeft: '10px' }} />
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            style={{ margin: '5px' }}
                            disabled={!hasUserDataChanged(user)}
                            onClick={() => {
                              this.saveEdits(user);
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
                            style={{ margin: '5px' }}
                            onClick={() => {
                              this.startEditing(user);
                            }}
                          >
                            Edit <EditIcon style={{ marginLeft: '10px' }} />
                          </Button>
                        </>
                      )}
                      {user.userData.userID !== userID && (
                        <Button
                          variant="contained"
                          color="primary"
                          style={{ margin: '5px' }}
                          onClick={() => {
                            this.deleteUser(user, rawIndex);
                          }}
                        >
                          Delete{' '}
                          <DeleteForeverIcon style={{ marginLeft: '10px' }} />
                        </Button>
                      )}
                    </Toolbar>
                  </Grid>
                </Grid>
              </Card>
            ))}
          </Card>
        </PageBody>
      </>
    );
  }
}

export default withStyles(styles)(Admin);

