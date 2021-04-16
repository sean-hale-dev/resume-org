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
import Header from './header.js';
import SearchIcon from '@material-ui/icons/Search';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PageBody from './pagebody.js';
import { withStyles } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';
import Autocomplete from '@material-ui/lab/Autocomplete';

const styles = (theme) => ({
  searchField: {
    width: '70%',
    // margin: "0 20px",
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

// Validate search query
function validateSearchQueryParentheses(queryString) {
  if (typeof queryString !== 'string') {
    return false;
  }
  let parenthesisTracker = 0;
  for (let i = 0; i < queryString.length; i++) {
    const char = queryString.charAt(i);
    if (char == ")") parenthesisTracker--;
    if (char == "(") parenthesisTracker++;
    if (parenthesisTracker < 0) return false;
  }
  return parenthesisTracker == 0;
}

function validateSearchQueryMacros(queryString) {
  const regExpMacro = /\$\d*\$/;
  const queryStringMacros = queryString.match(regExpMacro);
  // console.log(queryStringMacros);
  return !queryStringMacros || queryStringMacros.length == 0;
}

function validateSearchQuery(queryString) {
  const parenthesesGood = validateSearchQueryParentheses(queryString);
  const macrosGood = validateSearchQueryMacros(queryString);
  const issues = [];
  if (!parenthesesGood) issues.push("Mismatched parentheses");
  if (!macrosGood) issues.push("Query contains a problematic search macro");
  return {good: issues.length == 0, issues};
}

class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchText: "",
      searchOptions: [],
      activeOptions: [],
    };
  }

  componentDidMount() {
    // TODO: Call server for this
    // const searchOptions = ["python", "angular", "react", "c", "d", "js", "mips assembly"];
    // this.setState({searchOptions}, this.updateSearchOptions);
    axios.get(`http://${window.location.hostname}:8080/getAllSearchableSkills`).then(res => {
      if (res && Array.isArray(res.data)) {
        const skills = res.data;
        console.log(skills);
        this.setState({searchOptions: Array.isArray(skills) ? skills.sort() : []}, this.updateSearchOptions);
      }
    })
  }

  getLastTerm(searchText) {
    // Split string on "|", "&", "!", "*", "(", and ")"; then remove leading/trailing whitespace and remove empty terms
    const searchTerms = searchText.toLowerCase().split(/[\|\*&!\(\)]+/).map(term => term.trim());
    const trimmedSearchTerms = searchTerms.filter((term, index) => term || index == searchTerms.length - 1);
    // console.log(trimmedSearchTerms);
    const lastTerm = trimmedSearchTerms.length > 0 ? trimmedSearchTerms[trimmedSearchTerms.length - 1] : "";
    return lastTerm;
  }

  updateSearchOptions() {
    const {searchText, searchOptions} = this.state;
    // console.log(`searchText: ${searchText}`);
    const lastTerm = this.getLastTerm(searchText);
    const MAX_TERMS_TO_RENDER = 1000;
    const activeOptions = searchOptions
        .filter(option => option.toLowerCase().includes(lastTerm))
        .sort((a, b) => a.length - b.length)
        .filter((option, index) => index < MAX_TERMS_TO_RENDER)
        .sort()
        .sort((a, b) => a.indexOf(lastTerm) - b.indexOf(lastTerm));
    
    this.setState({activeOptions});
  }

  handleSearch() {
    const {handleSearch} = this.props;
    const {searchText} = this.state;
    handleSearch(searchText);
  }

  onSearchChange(event, newValue, reason) {
    // console.log(`Change ${reason}; newVal ${newValue}`);
    if (reason == "select-option") {
      // Handle yet another odd edge case caused by poor autocomplete behavior
      if (newValue === undefined) {
        const {searchText} = this.state;
        // console.log(`Undefined detected; searchText: ${searchText}`);
        this.setState({searchText: ""}, () => this.setState({searchText}));
        return;
      }
      // Cut last search term and replace
      const {searchText} = this.state;
      const lastTerm = this.getLastTerm(searchText);
      if (!lastTerm || searchText.lastIndexOf(lastTerm) == -1) {
        // Handle select from empty string
        this.setState({searchText: searchText + newValue}, this.updateSearchOptions);
      } else {
        const otherText = searchText.substring(0, searchText.lastIndexOf(lastTerm));
        // The multiple setState calls are necessary to deal with a buggy Autocomplete edge case where selecting an option but not updating
        // state causes the option to fill the text field rather than the correct controlled value. 
        this.setState({searchText: otherText}, () => this.setState({searchText: otherText + newValue}, this.updateSearchOptions));
      }
    }
  }

  onSearchInputChange(event, newValue, reason) {
    // console.log(`Change ${reason}; newVal ${newValue}`);
    if (reason == "input") this.setState({searchText: newValue}, this.updateSearchOptions);
    
  }

  render() {
    const {searchText, activeOptions} = this.state;
    // console.log(`Render searchText: ${searchText}`);
    const {classes, searchLabelText, searchButtonText} = this.props;
    const {good, issues} = validateSearchQuery(searchText);

    return <Toolbar className={classes.searchToolbar}>
      
    <Grid container justify="space-between" alignItems="center">
      <SearchIcon />
      <Autocomplete 
        freeSolo
        disableClearable
        options={activeOptions}
        value={searchText}
        className={classes.searchField}
        onChange={(event, newValue, reason) => this.onSearchChange(event, newValue, reason)}
        onInputChange={(event, newValue, reason) => this.onSearchInputChange(event, newValue, reason)}
        renderInput={(params) => 
        <TextField 
          {...params} 
          label={`${searchLabelText}${good ? "" : ` --- Warning: ${issues.join(", ")}`}`} 
          margin="normal" 
          variant="outlined" 
          type="search"
          error={!good}
        />}
      />
      <Button variant="contained" color="primary" onClick={() => {this.handleSearch()}} disabled={!good || !searchText}>
        {searchButtonText}
      </Button>
    </Grid>
  </Toolbar>
  }
}

export default withStyles(styles)(SearchBar);