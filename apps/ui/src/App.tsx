import { EvaixShell } from './components/core/EvaixShell.js';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { evaixTheme } from './theme.js';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <MuiThemeProvider theme={evaixTheme}>
        {/* The Shell is the only thing we render. 
            It contains the AvexBar and TheGrid. */}
        <EvaixShell />
      </MuiThemeProvider>
    </ThemeProvider>
  );
}

export default App;
