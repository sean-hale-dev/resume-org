import { blue, orange, grey } from '@material-ui/core/colors';
import { createMuiTheme } from '@material-ui/core/styles';

const resume_org_theme = createMuiTheme({
  palette: {
    primary: {
      main: "#ee2f3b",
    },
    secondary: {
      main: orange["A700"],
    },
  },
  overrides: {
    MuiDropzoneArea: {
      icon: {
        color: grey[500],
      },
      text: {
        color: grey[500],
      },
    },
    MuiCard: {
      root: {
        margin: "15px",
      },
    },
  },
});

export default resume_org_theme;