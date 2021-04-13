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

class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchText: "",
    };
  }

  render() {
    const {searchText} = this.state;
    const {classes, searchLabelText, searchButtonText} = this.props;
    return <Toolbar className={classes.searchToolbar}>
    <Grid container justify="space-between" alignItems="center">
      <SearchIcon />
      <TextField
        label={searchLabelText}
        variant="outlined"
        type="search"
        className={classes.searchField}
        value={searchText}
        onChange={event => {this.setState({searchText: event.target.value})}}
      />
      <Button variant="contained" color="primary" onClick={() => {this.handleSearch()}}>
        {searchButtonText}
      </Button>
    </Grid>
  </Toolbar>
  }
}

export default withStyles(styles)(SearchBar);