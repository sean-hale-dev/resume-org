import logo from './logo.svg';
import './App.css';
import { ThemeProvider } from '@material-ui/core';
import resume_org_theme from './components/shared/resume-org-theme';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect,
} from 'react-router-dom';
import Header from './components/shared/header';
import Home from './components/homepage';
import Resume from './components/resume';
import Database from './components/database';
import Reports from './components/reports';
import Login from './components/login';
import Profile from './components/profile';

import { withCookies, Cookies } from 'react-cookie';

function App(props) {
  const { cookies } = props;
  const userID = cookies.get('userID');
  return (
    <ThemeProvider theme={resume_org_theme}>
      <Router>
        <Switch>
          {/* <Route exact path="/" render={props => <Home {...props} userID={userID} />} /> */}
          <Route exact path="/">
            <Redirect to={userID ? '/resume' : '/login'} />
          </Route>
          <Route
            exact
            path="/resume"
            render={(props) => <Resume {...props} userID={userID} />}
          />
          <Route
            exact
            path="/database"
            render={(props) => <Database {...props} userID={userID} />}
          />
          <Route
            exact
            path="/reports"
            render={(props) => <Reports {...props} userID={userID} />}
          />
          <Route
            exact
            path="/login"
            render={(props) => (
              <Login {...props} userID={userID} cookies={cookies} />
            )}
          />
          {userID ? (
            <Route
              exact
              path="/profile"
              render={(props) => <Profile {...props} userID={userID} />}
            />
          ) : (
            <Route exact path="/profile">
              <Redirect to="/login" />
            </Route>
          )}
        </Switch>
      </Router>
    </ThemeProvider>
  );
  // return (
  //   <div className="App">
  //     <header className="App-header">
  //       <img src={logo} className="App-logo" alt="logo" />
  //       <p>
  //         Edit <code>src/App.js</code> and save to reload.
  //       </p>
  //       <a
  //         className="App-link"
  //         href="https://reactjs.org"
  //         target="_blank"
  //         rel="noopener noreferrer"
  //       >
  //         Learn React
  //       </a>
  //     </header>
  //   </div>
  // );
}

export default withCookies(App);
