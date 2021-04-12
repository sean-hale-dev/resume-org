import { Accordion, AccordionDetails, AccordionSummary, Button, Card, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Toolbar, Typography } from '@material-ui/core';
import React, { Component } from 'react';
import Header from './shared/header.js'
import SearchIcon from '@material-ui/icons/Search';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PageBody from './shared/pagebody.js';
import { withStyles } from '@material-ui/core/styles';
import { grey } from '@material-ui/core/colors';


const styles = theme => ({
  searchField: {
    width: "75%",
  },
  searchToolbar: {
    gap: "20px",
    justifyContent: "center",
  },
  searchToolbarButton: {
    gap: "20px",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: "20px",
  },
  reportTypography: {
    margin: "20px",
  },
});


class Reports extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    const { classes, userID } = this.props;
    return (<>
      <Header selectedPage="Reports" userID={userID}/>
      <PageBody>
        <Card>
          <Toolbar className={classes.searchToolbar}>
            <SearchIcon />
            <TextField label="Search Resumes" variant="outlined" className={classes.searchField}/>
          </Toolbar>
          <Toolbar className={classes.searchToolbarButton}>
            <Button variant="contained" color="primary">Generate Report</Button>
          </Toolbar>
        </Card>
        <Card>
          <Toolbar className={classes.searchToolbar}>
            <Typography className={classes.reportTypography} variant="h5">Report</Typography>
          </Toolbar>
          <div className={classes.reportTypography}>
            <Typography>There are 1067 employees in the organization. Of those:</Typography>
            <Typography>103 know React and Node.js</Typography>
            <Typography>57 only know React</Typography>
            <Typography>23 only know Node.js</Typography>
          </div>
        </Card>
      </PageBody>
    </>);
  }
}

export default withStyles(styles)(Reports);