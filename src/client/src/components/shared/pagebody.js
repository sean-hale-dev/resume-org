import React from 'react';
import { withStyles } from '@material-ui/core/styles';

const styles = (theme) => ({
  root: {
    maxWidth: '900px',
    margin: 'auto',
  },
});

/**
 * Create uniform-width pagebody
 * @param {Object} props.classes Styling
 */
function PageBody(props) {
  const { classes, children } = props;
  return <div className={classes.root}>{children}</div>;
}
export default withStyles(styles)(PageBody);

