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
import { Redirect } from 'react-router-dom';

const styles = (theme) => ({
  loginField: {
    width: '75%',
  },
  loginToolbar: {
    padding: '20px',
  },
});

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userText: '',
      loggingIn: false,
    };
  }

  handleLogin() {
    const { userText } = this.state;
    const { cookies } = this.props;
    cookies.set('userID', userText);
    this.setState({ userText: '' }, () => {
      axios
        .post(`http://${window.location.hostname}:8080/api/login`, {
          userID: userText,
        })
        .then((res) => {
          console.log('Login registered on server');
          this.setState({ loggingIn: true });
        });
    });
  }

  handleLogout() {
    const { cookies } = this.props;
    cookies.set('userID', '');
    this.setState({ userText: '' });
  }

  render() {
    const { userID, classes } = this.props;
    const { userText, loggingIn } = this.state;
    return (
      <>
        {loggingIn && <Redirect to="/profile" />}
        <Header selectedPage={userID ? 'Logout' : 'Login'} userID={userID} />
        <PageBody>
          <Typography variant="h5" align="center">
            WARNING: THIS IS A TEMPORARY LOGIN PAGE. PLEASE IMPLEMENT SECURE
            USER MANAGEMENT SYSTEM.
          </Typography>
          {userID ? (
            <>
              <Card>
                <Toolbar className={classes.loginToolbar}>
                  <Grid container justify="space-between" alignItems="center">
                    <Typography>Currently logged in as {userID}.</Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        this.handleLogout();
                      }}
                    >
                      Logout
                    </Button>
                  </Grid>
                </Toolbar>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <Toolbar className={classes.loginToolbar}>
                  <Grid container justify="space-between" alignItems="center">
                    <TextField
                      label="Username"
                      variant="outlined"
                      value={userText}
                      className={classes.loginField}
                      onChange={(event) => {
                        this.setState({ userText: event.target.value });
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        this.handleLogin();
                      }}
                    >
                      Login
                    </Button>
                  </Grid>
                </Toolbar>
              </Card>
            </>
          )}
        </PageBody>
      </>
    );
  }
}

export default withStyles(styles)(Login);
