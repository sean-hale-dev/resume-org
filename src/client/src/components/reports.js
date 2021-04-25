import { Card, Toolbar, Typography, Snackbar, Grow, Button } from '@material-ui/core';
import React, { Component } from 'react';
import Header from './shared/header.js';
import PageBody from './shared/pagebody.js';
import { withStyles } from '@material-ui/core/styles';
import { red } from '@material-ui/core/colors';
import SearchBar from './shared/searchBar.js';
import axios from 'axios';
import MuiAlert from '@material-ui/lab/Alert';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';

const styles = (theme) => ({
  searchField: {
    width: '75%',
  },
  searchToolbar: {
    gap: '20px',
    justifyContent: 'center',
  },
  searchToolbarButton: {
    gap: '20px',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: '20px',
  },
  reportTypography: {
    margin: '20px',
  },
});

class Reports extends Component {
  constructor(props) {
    super(props);
    this.state = {
      openSnackBar: false,
      typeSnackBar: 'generating',
      snackBarText: 'Generating report...',
    };
  }

  handleSearch(searchText) {
    const {userID} = this.props;
    console.log(`Searching for ${searchText}`);
    this.setState({
      openSnackBar: true,
      typeSnackBar: 'generating',
      snackBarText: 'Generating report...',
    });
    axios
      .post(`http://${window.location.hostname}:8080/api/resume-report`, {
        queryString: searchText,
        userID,
      })
      .then((res) => {
        console.log(res);
        this.setState({
          searchText,
          result: res.data,
          openSnackBar: true,
          typeSnackBar: 'success',
          snackBarText: 'Report generated.',
        });
      })
      .catch((err) => {
        this.setState({
          openSnackBar: true,
          typeSnackBar: 'error',
          snackBarText:
            'Could not generate report - the server did not respond.',
        });
        console.error(err);
      });
  }

  handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    this.setState({ openSnackBar: false });
  };

  jumpToSearch(newSearchText) {
    const { location, history } = this.props;
    const { searchText } = this.state;
    const reportSearch = (new URLSearchParams(location.search));
    reportSearch.set("autoSearch", "true");
    reportSearch.set("searchText", searchText);
    history.replace({search: reportSearch.toString()});
    const search = new URL(window.location);
    search.searchParams.set("searchText", newSearchText);
    search.searchParams.set("autoSearch", "true");
    search.pathname = "/database";
    window.location = search.toString();
  }

  render() {
    const { classes, userID, clientPermissions, location, history } = this.props;
    const { result, searchText } = this.state;
    const skillsArray = (result && result.individualSkillMatches && Object.keys(result.individualSkillMatches)) || [];
    return (
      <>
        <Header selectedPage="Reports" userID={userID} clientPermissions={clientPermissions} />
        <PageBody>
          <Card>
            <SearchBar
              userID={userID}
              searchLabelText="Report Query"
              searchButtonText="Generate Report"
              handleSearch={(searchText) => this.handleSearch(searchText)}
              location={location}
              history={history}
            />
          </Card>
          {result && (
            <Card>
              <Toolbar className={classes.searchToolbar}>
                <Typography className={classes.reportTypography} variant="h5">
                  Report
                </Typography>
              </Toolbar>

              <div className={classes.reportTypography}>
                {result.error ? (
                  <Typography style={{ color: red[500] }}>
                    Error generating the report: {result.message}
                  </Typography>
                ) : (
                  <>
                    {result.employeeCount !== undefined &&
                      <Typography>
                        There {result.employeeCount === 1 ? 'is' : 'are'}{' '}
                        {result.employeeCount} employee
                        {result.employeeCount === 1 ? '' : 's'} in the
                        organization.{' '}
                        {result.employeeCount === 1 ? '' : 'Of those:'}
                      </Typography>
                    }
                    {Object.entries(result.individualSkillMatches).length > 1 && 
                    result.strictMatchCount !== undefined &&
                      <Typography>
                        {result.strictMatchCount} strictly match
                        {result.strictMatchCount === 1 ? 'es' : ''} the query (
                        {(
                          (100.0 * result.strictMatchCount) /
                          result.employeeCount
                        ).toFixed(2)}
                        % of the organization).
                        <Button
                          onClick={() => {
                            this.jumpToSearch(searchText);
                          }}
                          value={result.employeeID}
                        >
                          View Resumes
                          <ArrowForwardIcon />
                        </Button>
                      </Typography>
                      
                    }
                    {Object.entries(result.individualSkillMatches).length > 1 && 
                    result.looseMatchCount !== undefined &&
                      <Typography>
                        {result.looseMatchCount}{' '}
                        {result.looseMatchCount === 1 ? 'has' : 'have'} at least
                        one skill in the query (
                        {(
                          (100.0 * result.looseMatchCount) /
                          result.employeeCount
                        ).toFixed(2)}
                        % of the organization).
                        <Button
                          onClick={() => {
                            this.jumpToSearch(skillsArray.join(" | "));
                          }}
                          value={result.employeeID}
                        >
                          View Resumes
                          <ArrowForwardIcon />
                        </Button>
                      </Typography>
                    }
                    {Object.entries(result.individualSkillMatches).map(
                      ([skill, count]) => (
                        <Typography>
                          {count} {count === 1 ? 'has' : 'have'} the skill "
                          {skill}" (
                          {((100.0 * count) / result.employeeCount).toFixed(2)}%
                          of the organization).
                          <Button
                            onClick={() => {
                              this.jumpToSearch(skill);
                            }}
                            value={result.employeeID}
                          >
                            View Resumes
                            <ArrowForwardIcon />
                          </Button>
                        </Typography>
                      )
                    )}
                  </>
                )}
              </div>
            </Card>
          )}
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
                this.state.typeSnackBar === 'generating'
                  ? 'info'
                  : this.state.typeSnackBar === 'error'
                  ? 'error'
                  : this.state.typeSnackBar === 'success'
                  ? 'success'
                  : ''
              }
            >
              {this.state.snackBarText}
            </MuiAlert>
          </Snackbar>
        </Grow>
      </>
    );
  }
}

export default withStyles(styles)(Reports);
