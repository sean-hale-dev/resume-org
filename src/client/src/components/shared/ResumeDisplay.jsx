import {
  Button,
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Link,
} from '@material-ui/core';
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';
import CloseIcon from '@material-ui/icons/Close';

const ResumeDisplay = (props) => {
  return (
    <Dialog
      open={props.open}
      onClose={props.toClose}
      aria-labelledby="resume-fileview-dialog"
      fullScreen
    >
      <DialogContent>
        <Box textAlign="right">
          <Link
            href={`http://${
              window.location.hostname === 'localhost'
                ? 'localhost:8080'
                : window.location.hostname
            }/api/resume-download?employee=${props.target}`}
            color="inherit"
          >
            <Button color="primary" variant="contained">
              Download resume
            </Button>
          </Link>

          <IconButton onClick={props.toClose}>
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
              }/api/resume-download?employee=${props.target}`,
            },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
};

export { ResumeDisplay };
