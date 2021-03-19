import { blue, orange } from '@material-ui/core/colors';
import { createMuiTheme } from '@material-ui/core/styles';

const resume_org_theme = createMuiTheme({
  palette: {
    primary: {
      main: blue["A700"],
    },
    secondary: {
      main: orange["A700"],
    },
  },
});

export default resume_org_theme;