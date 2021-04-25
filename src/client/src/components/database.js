import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  FormControl,
  Grid,
  IconButton,
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
import CloseIcon from '@material-ui/icons/Close';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PageBody from './shared/pagebody.js';
import { withStyles } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';
import SearchBar from './shared/searchBar.js';
import MuiAlert from '@material-ui/lab/Alert';
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';

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

const stringCompare = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

class Database extends Component {
  constructor(props) {
    super(props);
    // TODO: Implement Search Function
    this.state = {
      searchResults: [],
      // searchText: "",
      openSnackBar: false,
      typeSnackBar: '',
      snackBarText: '',
      resumeDialogOpen: false,
      resumeDialogTarget: '',
    };
    this.handleSearch.bind(this);
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

  handleSearch(searchText) {
    // const { searchText } = this.state;
    console.log(`Searching for ${searchText}`);
    this.setState({
      openSnackBar: true,
      typeSnackBar: 'searching',
      snackBarText: 'Searching...',
    });
    axios
      .post(`http://${window.location.hostname}:8080/api/resume-search`, {
        queryString: searchText,
      })
      .then((res) => {
        this.setState({
          searchResults: res.data.resumes.map((data, index) => ({
            name: data.employee || 'Unknown Employee',
            matchedSkills: data.skills || [],
            position: data.position || 'Unknown Position',
            experience: data.experience || 'Unknown',
            index,
            employeeID: data.employeeID || '',
          })),
          openSnackBar: true,
          typeSnackBar: res.data.status === 0 ? 'success' : 'error',
          snackBarText: res.data.message,
        });
      })
      .catch((err) => {
        this.setState({
          openSnackBar: true,
          typeSnackBar: 'error',
          snackBarText: 'Search failed - the server did not respond.',
        });
        console.error(err);
      })
      .finally(() => {
        setTimeout(() => {
          this.handleSnackbarClose(null, null);
        }, 5000);
      });
  }

  handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    this.setState({ openSnackBar: false });
  };

  handleSortSelect(selectedSort) {}

  render() {
    const { classes, userID, clientPermissions } = this.props;
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
              searchLabelText="Search Resumes"
              searchButtonText="Search"
              handleSearch={(searchText) => this.handleSearch(searchText)}
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
                        {result.matchedSkills.join(', ')}
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
                        {
                          // <Link
                          //   href={
                          //     result.employeeID
                          //       ? `http://${window.location.hostname}:8080/api/resume-download?employee=${result.employeeID}`
                          //       : ''
                          //   }
                          //   color="inherit"
                          // >
                          //   <Button disabled={!result.employeeID}>
                          //     View Resume
                          //     <ArrowForwardIcon />
                          //   </Button>
                          // </Link>
                        }
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

export default withStyles(styles)(Database);
