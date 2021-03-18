import React, { Component } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Link from '@material-ui/core/Link';

const PAGES = [
  {
    title: "Your Resume",
    link: "/resume",
  },
  {
    title: "Resume Database",
    link: "/database",
  },
  {
    title: "Reports",
    link: "/reports",
  },
]

/**
 * Props:
 * @param {String} selectedPage Currently active page. Used as title.
 */
class Header extends Component {

  constructor(props) {
    super(props);
    this.state = {
      open: false,
    }
  }

  toggleDrawer(open = undefined) {
    return (event) => {
      if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
        return;
      }
      if (open === undefined) {
        this.setState({open: !this.state.open});
      } else {
        this.setState({open});
      }
    }
  }

  render () {
    const {open} = this.state; 
    const {selectedPage} = this.props;
    console.log(`Selected page: ${selectedPage}`);
    return <AppBar position="static">
      <Grid container>
        <Grid item xs={1}>
          <Toolbar>
            <SwipeableDrawer
              anchor={"left"}
              open={open}
              onClose={this.toggleDrawer(false)}
              onOpen={this.toggleDrawer(true)}
            >
              <List style={{width: "250px"}}>
                {PAGES.map(page => 
                  <Link href={page.link} color="inherit" >
                    <ListItem button key={page.title}>
                      <ListItemText disableTypography primary={page.title} style={{fontWeight: selectedPage == page.title ? "bold" : "normal"}}/>
                    </ListItem>
                  </Link>
                )}
              </List>
            </SwipeableDrawer>
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={this.toggleDrawer()}>
              <MenuIcon />
            </IconButton>
            
          </Toolbar>
        </Grid>
        <Grid item xs={10}>
          <Toolbar style={{justifyContent: "center"}}>
            <Typography variant="h3">
              {selectedPage}
            </Typography>
          </Toolbar>
        </Grid>
      </Grid>
    </AppBar>
  }
}

export default Header;