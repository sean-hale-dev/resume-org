import './App.css';
import React, { Component } from 'react';
import { ThemeProvider } from '@material-ui/core';
import resume_org_theme from './components/shared/resume-org-theme';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';
import Resume from './components/resume';
import Database from './components/database';
import Reports from './components/reports';
import Login from './components/login';
import Profile from './components/profile';
import Admin from './components/admin';

import { withCookies } from 'react-cookie';
import axios from 'axios';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clientPermissions: props.cookies.get('clientPermissions') || {},
      // Tracking variable for the userID associated with current client permissions
    };
    this.clientPermissionUserID = props.cookies.get('userID');
  }

  componentDidMount() {
    this.updatePermissions();
  }

  /**
   * Update client permissions to ensure that they match userID
   */
  updatePermissions() {
    const { cookies } = this.props;
    const userID = cookies.get('userID');
    this.clientPermissionUserID = userID;
    axios
      .get(
        `http://${window.location.hostname}:8080/getClientPermissions?userID=${userID}`
      )
      .then((res) => {
        cookies.set('clientPermissions', res.data);
        this.setState({ clientPermissions: res.data }, () => {
          this.updatingPermissions = false;
        });
      });
  }

  render() {
    const { clientPermissions } = this.state;
    const { cookies, history } = this.props;
    const userID = cookies.get('userID');

    // Update client permissions on cookie update
    let shouldRedirect = true;
    if (userID !== this.clientPermissionUserID) {
      this.updatingPermissions = true;
      this.clientPermissionUserID = userID;
      this.updatePermissions();
    }
    if (this.updatingPermissions) {
      shouldRedirect = false;
    }

    return (
      <ThemeProvider theme={resume_org_theme}>
        <Router>
          <Switch>
            <Route exact path="/">
              <Redirect to={userID ? '/resume' : '/login'} />
            </Route>
            {shouldRedirect && clientPermissions['/resume'] === false ? (
              <Route exact path="/resume">
                <Redirect to="/login" />
              </Route>
            ) : (
              <Route
                exact
                path="/resume"
                render={(props) => (
                  <Resume
                    {...props}
                    userID={userID}
                    clientPermissions={clientPermissions}
                  />
                )}
              />
            )}
            {shouldRedirect && clientPermissions['/database'] === false ? (
              <Route exact path="/database">
                <Redirect to="/login" />
              </Route>
            ) : (
              <Route
                exact
                path="/database"
                render={(props) => (
                  <Database
                    {...props}
                    userID={userID}
                    clientPermissions={clientPermissions}
                    history={history}
                  />
                )}
              />
            )}
            {shouldRedirect && clientPermissions['/reports'] === false ? (
              <Route exact path="/reports">
                <Redirect to="/login" />
              </Route>
            ) : (
              <Route
                exact
                path="/reports"
                render={(props) => (
                  <Reports
                    {...props}
                    userID={userID}
                    clientPermissions={clientPermissions}
                    history={history}
                  />
                )}
              />
            )}
            <Route
              exact
              path="/login"
              render={(props) => (
                <Login
                  {...props}
                  userID={userID}
                  cookies={cookies}
                  clientPermissions={clientPermissions}
                />
              )}
            />
            {shouldRedirect && clientPermissions['/profile'] === false ? (
              <Route exact path="/profile">
                <Redirect to="/login" />
              </Route>
            ) : (
              <Route
                exact
                path="/profile"
                render={(props) => (
                  <Profile
                    {...props}
                    userID={userID}
                    clientPermissions={clientPermissions}
                  />
                )}
              />
            )}
            {shouldRedirect && clientPermissions['/admin'] === false ? (
              <Route exact path="/admin">
                <Redirect to="/login" />
              </Route>
            ) : (
              <Route
                exact
                path="/admin"
                render={(props) => (
                  <Admin
                    {...props}
                    userID={userID}
                    cookies={cookies}
                    clientPermissions={clientPermissions}
                  />
                )}
              />
            )}
          </Switch>
        </Router>
      </ThemeProvider>
    );
  }
}

export default withCookies(App);
