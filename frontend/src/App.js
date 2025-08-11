import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography } from '@mui/material';
import TradingDashboard from './components/TradingDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#0a1929',
      paper: '#1e293b',
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="App">
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Aetherion Trading Engine
              </Typography>
            </Toolbar>
          </AppBar>
          <div style={{ padding: '24px' }}>
            <TradingDashboard />
          </div>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
