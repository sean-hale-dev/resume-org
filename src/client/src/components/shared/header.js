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
    title: 'Your Resume',
    link: '/resume',
  },
  {
    title: 'Resume Database',
    link: '/database',
  },
  {
    title: 'Reports',
    link: '/reports',
  },
  {
    title: 'Admin Dashboard',
    link: '/admin',
  },
];

/**
 * Props:
 * @param {String} selectedPage Currently active page. Used as title.
 * @param {String} userID User ID
 * @param {Object} clientPermissions Object containing list of links that client has access to
 */
class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
    };
  }

  /**
   * Function constructor to toggle the drawer.
   * @param {boolean} open Optional. If undefined, creates a function that toggles the drawer. If defined, creates a function that
   * sets the open property to its definition.
   * @returns Function that toggles/opens/closes the drawer: format toggle(event)
   */
  toggleDrawer(open = undefined) {
    return (event) => {
      if (
        event &&
        event.type === 'keydown' &&
        (event.key === 'Tab' || event.key === 'Shift')
      ) {
        return;
      }
      if (open === undefined) {
        this.setState({ open: !this.state.open });
      } else {
        this.setState({ open });
      }
    };
  }

  render() {
    const { open } = this.state;
    const { selectedPage, userID, clientPermissions } = this.props;
    console.log(`Selected page: ${selectedPage}`);
    return (
      <AppBar position="static">
        <Grid container>
          <Grid item xs={2}>
            <Toolbar>
              {PAGES.filter((page) => clientPermissions[page.link]).length >
                0 && (
                <>
                  <SwipeableDrawer
                    anchor={'left'}
                    open={open}
                    onClose={this.toggleDrawer(false)}
                    onOpen={this.toggleDrawer(true)}
                  >
                    <List style={{ width: '250px' }}>
                      {PAGES.filter((page) => clientPermissions[page.link]).map(
                        (page) => (
                          <Link href={page.link} color="inherit">
                            <ListItem button key={page.title}>
                              <ListItemText
                                disableTypography
                                primary={page.title}
                                style={{
                                  fontWeight:
                                    selectedPage === page.title
                                      ? 'bold'
                                      : 'normal',
                                }}
                              />
                            </ListItem>
                          </Link>
                        )
                      )}
                    </List>
                  </SwipeableDrawer>
                  <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="menu"
                    onClick={this.toggleDrawer()}
                  >
                    <MenuIcon />
                  </IconButton>
                </>
              )}
            </Toolbar>
          </Grid>
          <Grid item xs={8}>
            <Toolbar style={{ justifyContent: 'center' }}>
              <Typography variant="h4">{selectedPage}</Typography>
            </Toolbar>
          </Grid>
          <Grid item xs={2}>
            <Toolbar style={{ justifyContent: 'flex-end' }}>
              {userID && (
                <Link href={'/profile'}>
                  <Typography
                    variant="h6"
                    style={{ color: 'white' }}
                    align="right"
                  >
                    {userID}
                  </Typography>
                </Link>
              )}
              <Link href={'/login'} style={{ paddingLeft: '16px' }}>
                <Typography
                  variant="h6"
                  style={{ color: 'white' }}
                  align="right"
                >
                  {userID ? 'Logout' : 'Login'}
                </Typography>
              </Link>
            </Toolbar>
          </Grid>
        </Grid>
      </AppBar>
    );
  }
}

export default Header;
