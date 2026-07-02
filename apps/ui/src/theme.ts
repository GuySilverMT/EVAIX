import { createTheme } from '@mui/material/styles';

export const evaixTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c6bff' }, // Playfair theme primary
    secondary: { main: '#892481' }, // Modelbar theme primary
    background: { default: '#0e0e0f', paper: '#18181a' },
    divider: '#606062',
    success: { main: '#16c522' }, // model-high
  },
  typography: {
    fontFamily: "'Playfair Display', 'Syne', sans-serif",
    fontSize: 12, // Base scale down
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
    MuiBox: {
      styleOverrides: {
        root: { padding: 0, margin: 0 }
      }
    } as any,
    MuiInputBase: {
      styleOverrides: {
        input: { padding: '0px !important', fontSize: '14px' }
      }
    }
  }
});
