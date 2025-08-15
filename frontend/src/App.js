import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import TradingDashboard from './components/TradingDashboard';
import Login from './components/Login';
import AccountPage from './components/AccountPage';
import LandingPage from './components/LandingPage';
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
  const [view, setView] = useState('landing'); // Start with landing page
  
  const handleGetStarted = () => {
    setView('login');
  };
  
  return (
    <ErrorBoundary>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="App">
          {/* Only show app bar when not on landing page */}
          {view !== 'landing' && (
            <AppBar position="static">
              <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor:'pointer' }} onClick={()=>setView(user ? 'dashboard' : 'landing')}>
                  Aetherion Trading Engine
                </Typography>
                {user && (
                  <Box>
                    <Button color="inherit" onClick={()=>setView('account')} sx={{ mr:1 }}>Account</Button>
                    <Button color="inherit" onClick={()=>setView('dashboard')}>Dashboard</Button>
                  </Box>
                )}
                {!user && (
                  <Button color="inherit" onClick={()=>setView('landing')}>
                    Home
                  </Button>
                )}
              </Toolbar>
            </AppBar>
          )}
          
          {/* Content based on current view */}
          {view === 'landing' && <LandingPage onGetStarted={handleGetStarted} />}
          {view === 'login' && (
            <Box sx={{ 
              minHeight: '100vh', 
              background: 'linear-gradient(135deg, #0a1929 0%, #1a1a2e 100%)',
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Login onAuth={(u)=> { setUser(u); setView('dashboard'); }} onBack={() => setView('landing')} />
            </Box>
          )}
          {user && view === 'dashboard' && (
            <div style={{ padding: '24px' }}>
              <TradingDashboard />
            </div>
          )}
          {user && view === 'account' && (
            <div style={{ padding: '24px' }}>
              <AccountPage user={user} onLogout={() => { setUser(null); setView('landing'); }} />
            </div>
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
