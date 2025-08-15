import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import TradingDashboard from './components/TradingDashboard';
import Login from './components/Login';
import AccountPage from './components/AccountPage';
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
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  return (
    <ErrorBoundary>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="App">
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor:'pointer' }} onClick={()=>setView('dashboard')}>
                Aetherion Trading Engine
              </Typography>
              {user && (
                <Box>
                  <Button color="inherit" onClick={()=>setView('account')} sx={{ mr:1 }}>Account</Button>
                  <Button color="inherit" onClick={()=>setView('dashboard')}>Dashboard</Button>
                </Box>
              )}
            </Toolbar>
          </AppBar>
          <div style={{ padding: '24px' }}>
            {!user && <Login onAuth={(u)=> { setUser(u); setView('dashboard'); }} />}
            {user && view === 'dashboard' && <TradingDashboard />}
            {user && view === 'account' && <AccountPage user={user} onLogout={() => { setUser(null); setView('dashboard'); }} />}
          </div>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
