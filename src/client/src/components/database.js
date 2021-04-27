import {
  Button,
  Card,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Toolbar,
  Typography,
  Snackbar,
  Grow,
} from '@material-ui/core';
import React, { Component } from 'react';
import Header from './shared/header.js';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PageBody from './shared/pagebody.js';
import { withStyles } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';
import SearchBar from './shared/searchBar.js';
import MuiAlert from '@material-ui/lab/Alert';
import { ResumeDisplay } from './shared/ResumeDisplay';

const styles = (theme) => ({
  searchField: {
    width: '75%',
  },
  searchToolbar: {
    gap: '20px',
    justifyContent: 'center',
  },
  searchOptions: {
    boxShadow: '0',
    borderStyle: 'none',
  },
  resultsTypography: {
    alignSelf: 'center',
    padding: '0 20px',
  },
  resultsSortBy: {
    alignSelf: 'center',
    width: '90%',
    margin: '10px',
  },
  resultCard: {
    padding: '20px',
  },
  resultsCard: {
    backgroundColor: grey[100],
  },
  viewResumeContainer: {
    justifyContent: 'flex-end',
  },
});

/**
 * Compare two strings
 * @param {String} a 
 * @param {String} b 
 * @returns 1 if a > b, -1 if a < 0, 0 if a == b
 */
const stringCompare = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Props:
 * @param {String} userID userID string
 * @param {Object} clientPermissions Object containing list of links that client has access to
 * @param {*} location React Router location
 * @param {*} history "history" library object
 */
class Database extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchResults: [],
      openSnackBar: false,
      typeSnackBar: '',
      snackBarText: '',
      resumeDialogOpen: false,
      resumeDialogTarget: '',
    };
    this.handleSearch.bind(this);
  }

  /**
   * View an employee's resume
   * @param {String} employeeID 
   */
  openResumeDialog = (employeeID) => {
    this.setState({
      resumeDialogOpen: true,
      resumeDialogTarget: employeeID,
    });
  };

  /**
   * Stop viewing a resume
   */
  closeResumeDialog = () => {
    this.setState({
      resumeDialogOpen: false,
      resumeDialogTarget: '',
    });
  };

  /**
   * Search for a string!
   * @param {String} searchText 
   */
  handleSearch(searchText) {
    const {userID} = this.props;
    console.log(`Searching for ${searchText}`);
    this.setState({
      openSnackBar: true,
      typeSnackBar: 'searching',
      snackBarText: 'Searching...',
    });
    axios.post(`http://${window.location.hostname}:8080/api/resume-search`, {queryString: searchText, userID}).then(res => {
      this.setState({
        searchResults: res.data.resumes.map((data, index) => ({
          name: data.employee || "Unknown Employee",
          matchedSkills: data.skills || [], 
          displaySkills: [],
          position: data.position || "Unknown Position",
          experience: data.experience || "Unknown",
          index,
          employeeID: data.employeeID || "",
        })),
        openSnackBar: true,
        typeSnackBar: res.data.status == 0 ? "success" : "error",
        snackBarText: res.data.message,
      });
      
      const skillsToFetch = []
      this.state.searchResults.forEach(searchResult => {
        skillsToFetch.push(searchResult.matchedSkills);
      });
      
      //////// getting the display skills
      axios.post(`http://${window.location.hostname}:8080/api/skill-display-names?assoc=false`, { skillarrays: skillsToFetch }).then(result => {
        
        this.setState({
          searchResults: this.state.searchResults.map((data, index) => ({
            name: data.name,
            matchedSkills: data.matchedSkills, 
            displaySkills: result.data.display_assoc[index],
            position: data.position,
            experience: data.experience,
            index,
            employeeID: data.employeeID,
          }))
        });
      })
      .catch((err) => {
        console.error(err);
      });
    })
    .catch((err) => {
      this.setState({
        openSnackBar: true,
        typeSnackBar: "error",
        snackBarText: "Search failed - the server did not respond."
      });
      console.error(err);
    });
  }

  handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    this.setState({ openSnackBar: false });
  };

  render() {
    const { classes, userID, clientPermissions, location, history } = this.props;
    const { searchResults } = this.state;
    const sortOptions = {
      '----': () => {
        searchResults.sort((a, b) => a.index - b.index);
        this.setState({ searchResults });
      },
      'Name (A-Z)': () => {
        searchResults.sort((a, b) => stringCompare(a.name, b.name));
        this.setState({ searchResults });
      },
      'Position (A-Z)': () => {
        searchResults.sort((a, b) => stringCompare(a.position, b.position));
        this.setState({ searchResults });
      },
      'Most Experience': () => {
        searchResults.sort((a, b) => (b.experience || 0) - (a.experience || 0));
        this.setState({ searchResults });
      },
      'Most Skills Matched': () => {
        searchResults.sort(
          (a, b) => b.matchedSkills.length - a.matchedSkills.length
        );
        this.setState({ searchResults });
      },
      'Least Experience': () => {
        searchResults.sort((a, b) => (a.experience || 0) - (b.experience || 0));
        this.setState({ searchResults });
      },
      'Least Skills Matched': () => {
        searchResults.sort(
          (a, b) => a.matchedSkills.length - b.matchedSkills.length
        );
        this.setState({ searchResults });
      },
    };

    return (
      <>
        <Header selectedPage="Resume Database" userID={userID}  clientPermissions={clientPermissions}/>
        <PageBody>
          <Card>
            <SearchBar
              userID={userID}
              searchLabelText="Search Resumes"
              searchButtonText="Search"
              handleSearch={(searchText) => this.handleSearch(searchText)}
              location={location}
              history={history}
            />
          </Card>
          <Card className={classes.resultsCard}>
            <Grid container alignItems="center">
              <Grid item xs={8}>
                <Typography variant="h6" className={classes.resultsTypography}>
                  Results
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
            {searchResults.map((result) => (
              <>
                <Card className={classes.resultCard}>
                  <Grid container alignItems="center">
                    <Grid item xs={5}>
                      <Typography variant="h5">{result.name}</Typography>
                      <Typography>
                        {result.position}, {result.experience} year
                        {result.experience === 1 ? '' : 's'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography>
                        <strong>Skills matched: </strong>
                        {result.displaySkills.join(', ')}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Toolbar className={classes.viewResumeContainer}>
                        <Button
                          onClick={() => {
                            this.openResumeDialog(result.employeeID);
                          }}
                          value={result.employeeID}
                        >
                          View Resume
                          <ArrowForwardIcon />
                        </Button>
                      </Toolbar>
                    </Grid>
                  </Grid>
                </Card>
              </>
            ))}
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
                this.state.typeSnackBar === 'searching'
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
        <ResumeDisplay
          open={this.state.resumeDialogOpen}
          toClose={this.closeResumeDialog}
          target={this.state.resumeDialogTarget}
        />
      </>
    );
  }
}

export default withStyles(styles)(Database);
