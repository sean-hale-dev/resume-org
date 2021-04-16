import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
} from '@material-ui/core';
import React, { Component } from 'react';
import Header from './shared/header.js';
import SearchIcon from '@material-ui/icons/Search';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PageBody from './shared/pagebody.js';
import { withStyles } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';
import SearchBar from './shared/searchBar.js';


const DUMMY_DATA = [
  {
    name: 'Emma Example',
    position: 'Software Engineer',
    experience: 10,
    matchedSkills: ['Angular', 'JavaScript'],
  },
  {
    name: 'Samuel Sample',
    position: 'Web Developer',
    experience: 8,
    matchedSkills: ['React', 'JavaScript'],
  },
  {
    name: 'Timothy Test',
    position: 'Junior Web Developer',
    experience: 3,
    matchedSkills: ['Angular', 'React', 'JavaScript'],
  },
];

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
}

class Database extends Component {
  constructor(props) {
    super(props);
    // TODO: Implement Search Function
    this.state = {
      searchResults: [],
      // searchText: "",
    };
    this.handleSearch.bind(this);
  }

  handleSearch(searchText) {
    // const { searchText } = this.state;
    console.log(`Searching for ${searchText}`);
    axios.post(`http://${window.location.hostname}:8080/resume-search`, {queryString: searchText}).then(res => {
      console.log(res);
      this.setState({
        searchResults: res.data.map((data, index) => ({
          name: data.employee || "Unknown Employee",
          matchedSkills: data.skills || [], 
          position: data.position || "Unknown Position",
          experience: data.experience || "Unknown",
          index,
        }))
      })
    })
  }

  

  handleSortSelect(selectedSort) {

  }

  render() {
    const { classes, userID } = this.props;
    const { searchResults, searchText } = this.state;
    const sortOptions = {
      "----": () => {
        searchResults.sort((a, b) => a.index - b.index);
        this.setState({searchResults});
      },
      "Name (A-Z)": () => {
        searchResults.sort((a, b) => stringCompare(a.name, b.name));
        this.setState({searchResults});
      },
      "Position (A-Z)": () => {
        searchResults.sort((a, b) => stringCompare(a.position, b.position));
        this.setState({searchResults});
      },
      "Most Experience": () => {
        searchResults.sort((a, b) => (b.experience || 0) - (a.experience || 0));
        this.setState({searchResults});
      },
      "Most Skills Matched": () => {
        searchResults.sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);
        this.setState({searchResults});
      },
      "Least Experience": () => {
        searchResults.sort((a, b) => (a.experience || 0) - (b.experience || 0));
        this.setState({searchResults});
      },
      "Least Skills Matched": () => {
        searchResults.sort((a, b) => a.matchedSkills.length - b.matchedSkills.length);
        this.setState({searchResults});
      },
    }

    return (
      <>
        <Header selectedPage="Resume Database" userID={userID}/>
        <PageBody>
          <Card>
            <SearchBar 
              searchLabelText="Search Resumes"
              searchButtonText="Search"
              handleSearch={searchText => this.handleSearch(searchText)}
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
                  <Select labelId="results-sort-label" id="results-sort" onChange={event => sortOptions[event.target.value]()}>
                    {Object.keys(sortOptions).map(sortOption => <MenuItem value={sortOption}>{sortOption}</MenuItem>)}
                    {/* <MenuItem value="Experience">Experience</MenuItem>
                    <MenuItem value="Skill Match">Skill Match</MenuItem> */}
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
                        {result.experience == 1 ? '' : 's'}
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
                        <Button>
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
      </>
    );
  }
}

export default withStyles(styles)(Database);

