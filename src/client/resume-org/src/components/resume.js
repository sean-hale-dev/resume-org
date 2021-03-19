import React, { Component } from 'react';
import Header from './shared/header.js';
import {DropzoneArea} from 'material-ui-dropzone';
import PageBody from './shared/pagebody.js';
import { Card } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles'
import './styles/resume.css';
import { grey } from '@material-ui/core/colors';

const styles = theme => ({
  resumeUploadCard: {
    padding: "20px 25%",
  },
  dropzoneText: {
    padding: "0 20px",
  },
});

class Resume extends Component {

  constructor(props) {
    super(props);
  }

  render () {
    const { classes } = this.props;
    return (<>
      <Header selectedPage="Your Resume" />
      <PageBody>
        <Card className={classes.resumeUploadCard}>
          <DropzoneArea
            dropzoneText="Upload Resume"
            acceptedFiles={[".pdf", ".doc", "docx"]}
            dropzoneParagraphClass={classes.dropzoneText}
            filesLimit={1}
            showPreviews={true}
            showPreviewsInDropzone={false}
            useChipsForPreview
          />
        </Card>
      </PageBody>
    </>);
  }
}

export default withStyles(styles)(Resume);