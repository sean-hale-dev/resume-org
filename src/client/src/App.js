import logo from './logo.svg';
import './App.css';
import { ThemeProvider } from '@material-ui/core';
import resume_org_theme from './components/shared/resume-org-theme';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import Header from './components/shared/header';
import Home from './components/homepage';
import Resume from './components/resume';
import Database from './components/database';
import Reports from './components/reports';
function App() {
  return (
    <ThemeProvider theme={resume_org_theme}>
      <Router>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/resume" component={Resume} />
          <Route exact path="/database" component={Database} />
          <Route exact path="/reports" component={Reports} />
        </Switch>
      </Router>
    </ThemeProvider>
  )
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

export default App;
