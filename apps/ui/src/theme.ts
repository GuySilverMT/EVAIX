import { createTheme } from '@mui/material/styles';

export const evaixTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c4bac3'
    },
    background: {
      default: '#c4bac3',
      paper: '#18181a'
    },
    text: {
      primary: '#c4bac3',
      secondary: '#c4bac3'
    },
    divider: '#c4bac3',
    error: {
      main: '#c4bac3'
    },
    success: {
      main: '#c4bac3'
    },
    warning: {
      main: '#c4bac3'
    }
  },
  typography: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 22,
    button: { textTransform: 'none' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { padding: 0, minWidth: 'auto', borderRadius: 0 }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: { padding: 2, borderRadius: 0 }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: { padding: '0px !important', fontSize: '14px' }
      }
    }
  }
});
