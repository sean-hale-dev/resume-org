import { Button, Grid, TextField, Toolbar } from '@material-ui/core';
import React, { Component } from 'react';
import SearchIcon from '@material-ui/icons/Search';
import { withStyles } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';
import axios from 'axios';
import Autocomplete from '@material-ui/lab/Autocomplete';

const styles = (theme) => ({
  searchField: {
    width: '70%',
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
 * Validate search query parentheses
 * @param {String} queryString 
 * @returns Whether the query string has matching parentheses
 */
function validateSearchQueryParentheses(queryString) {
  if (typeof queryString !== 'string') {
    return false;
  }
  let parenthesisTracker = 0;
  for (let i = 0; i < queryString.length; i++) {
    const char = queryString.charAt(i);
    if (char === ')') parenthesisTracker--;
    if (char === '(') parenthesisTracker++;
    if (parenthesisTracker < 0) return false;
  }
  return parenthesisTracker === 0;
}

/**
 * Validate that the string has no macros
 * @param {String} queryString 
 * @returns Whether the string has any problematic search macros
 */
function validateSearchQueryMacros(queryString) {
  const regExpMacro = /\$\d*\$/;
  const queryStringMacros = queryString.match(regExpMacro);
  return !queryStringMacros || queryStringMacros.length === 0;
}

/**
 * Validate a query string
 * @param {String} queryString 
 * @returns Object{good: boolean, issues: Array} Whether the string is good, and any errors if present
 */
function validateSearchQuery(queryString) {
  const parenthesesGood = validateSearchQueryParentheses(queryString);
  const macrosGood = validateSearchQueryMacros(queryString);
  const issues = [];
  if (!parenthesesGood) issues.push('Mismatched parentheses');
  if (!macrosGood) issues.push('Query contains a problematic search macro');
  return { good: issues.length === 0, issues };
}

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
 * @param {*} location React Router location
 * @param {String} userID userID string
 * @param {*} history "history" library object
 * @param {*} handleSearch Function called on search. Must accept searchText string param
 * @param {String} searchButtonText
 * @param {String} searchLabelText
 */
class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchText: (new URLSearchParams(props.location.search)).get("searchText") || "",
      searchOptions: [],
      activeOptions: [],
    };
  }

  componentDidMount() {
    const {userID, location} = this.props;
    const {searchText} = this.state;
    const { good, issues } = validateSearchQuery(searchText);
    if (good && (new URLSearchParams(location.search)).get("autoSearch") && searchText) {
      this.handleSearch();
    }
    axios
      .post(`http://${window.location.hostname}:8080/api/getAllSearchableSkills`, {userID})
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          const skills = res.data;
          this.setState(
            { searchOptions: Array.isArray(skills) ? skills.sort((a, b) => stringCompare(a.name, b.name)) : [] },
            () => this.updateSearchOptions()
          );
        }
      });
  }

  /**
   * Get the last term in a search string
   * @param {String} searchText 
   * @returns Lowercase last term in a search string
   */
  getLastTerm(searchText) {
    // Split string on "|", "&", "!", "*", "(", and ")"; then remove leading/trailing whitespace and remove empty terms
    const searchTerms = searchText
      .toLowerCase()
      .split(/[|*&!()]+/)
      .map((term) => term.trim());
    const trimmedSearchTerms = searchTerms.filter(
      (term, index) => term || index === searchTerms.length - 1
    );
    const lastTerm =
      trimmedSearchTerms.length > 0
        ? trimmedSearchTerms[trimmedSearchTerms.length - 1]
        : '';
    return lastTerm;
  }

  /**
   * Update active search options to match new search text.
   */
  updateSearchOptions() {
    const { searchText, searchOptions } = this.state;
    const lastTerm = this.getLastTerm(searchText);
    const MAX_TERMS_TO_RENDER = 1000;
    const activeOptions = searchOptions
      .filter((option) => option.name.toLowerCase().includes(lastTerm))
      .sort((a, b) => a.name.length - b.name.length)
      .filter((option, index) => index < MAX_TERMS_TO_RENDER)
      .sort((a, b) => stringCompare(a.name, b.name))
      .sort((a, b) => a.name.indexOf(lastTerm) - b.name.indexOf(lastTerm))
      .map(option => (option.display_name && option.display_name.toLowerCase() == option.name) ? option.display_name : option.name);
    
    this.setState({ activeOptions });
  }

  /**
   * Update the appropriate values upon getting new search text.
   * @param {String} searchText 
   */
  setSearchText(searchText) {
    const {location, history} = this.props;
    this.setState({searchText}, () => {
      const search = (new URLSearchParams(location.search));
      search.set("searchText", searchText);
      history.replace({search: search.toString()});
      this.updateSearchOptions();
    })
  }

  /**
   * Call the "handleSearch" prop function 
   */
  handleSearch() {
    const { handleSearch } = this.props;
    const { searchText } = this.state;
    handleSearch(searchText);
  }

  /**
   * Handle autocomplete select
   * @param {*} event 
   * @param {*} newValue 
   * @param {*} reason 
   */
  onSearchChange(event, newValue, reason) {
    if (reason === 'select-option') {
      // Handle yet another odd edge case caused by poor autocomplete behavior
      if (newValue === undefined) {
        const { searchText } = this.state;
        this.setState({ searchText: '' }, () => this.setSearchText(searchText));
        return;
      }
      // Cut last search term and replace
      const { searchText } = this.state;
      const lastTerm = this.getLastTerm(searchText);
      if (!lastTerm || searchText.toLowerCase().lastIndexOf(lastTerm) == -1) {
        // Handle select from empty string
        this.setSearchText(searchText + newValue);
      } else {
        const otherText = searchText.substring(0, searchText.toLowerCase().lastIndexOf(lastTerm));
        // The multiple setState calls are necessary to deal with a buggy Autocomplete edge case where selecting an option but not updating
        // state causes the option to fill the text field rather than the correct controlled value.
        this.setState({ searchText: otherText }, () =>
          this.setSearchText(otherText + newValue)
        );
      }
    }
  }

  /**
   * Handle typed input
   * @param {*} event 
   * @param {*} newValue 
   * @param {*} reason 
   */
  onSearchInputChange(event, newValue, reason) {
    if (reason === 'input') {
      this.setSearchText(newValue);
    }
  }

  render() {
    const { searchText, activeOptions } = this.state;
    const { classes, searchLabelText, searchButtonText } = this.props;
    const { good, issues } = validateSearchQuery(searchText);

    return (
      <Toolbar className={classes.searchToolbar}>
        <Grid container justify="space-between" alignItems="center">
          <SearchIcon />
          <Autocomplete
            freeSolo
            disableClearable
            options={activeOptions}
            value={searchText}
            className={classes.searchField}
            onChange={(event, newValue, reason) =>
              this.onSearchChange(event, newValue, reason)
            }
            onInputChange={(event, newValue, reason) =>
              this.onSearchInputChange(event, newValue, reason)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={`${searchLabelText}${
                  good ? '' : ` --- Warning: ${issues.join(', ')}`
                }`}
                margin="normal"
                variant="outlined"
                type="search"
                error={!good}
              />
            )}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              this.handleSearch();
            }}
            disabled={!good || !searchText}
          >
            {searchButtonText}
          </Button>
        </Grid>
      </Toolbar>
    );
  }
}

export default withStyles(styles)(SearchBar);
