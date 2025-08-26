import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Box, Tooltip, CircularProgress, Snackbar, Alert, Menu, MenuItem } from '@mui/material';
import TradingDashboard from './components/TradingDashboard';

import TradingOperations from './components/TradingOperations';
import BotsFreePage from './components/BotsFreePage';
import DevelopBotPage from './components/DevelopBotPage';
import AboutPage from './components/AboutPage'; 
import ContactPage from './components/ContactPage';
import NewsPage from './components/NewsPage';
import Login from './components/Login';
import AccountPage from './components/AccountPage';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import BacktestRunner from './components/BacktestRunner';
import PricingPage from './components/PricingPage';
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
  const [health, setHealth] = useState({ status:'unknown', ts:null, fails:0 });
  const [showHealthWarn, setShowHealthWarn] = useState(false);
  const [liveFetchStatus, setLiveFetchStatus] = useState(null); // null | 'success' | 'error'
  const [showLiveFetchSnackbar, setShowLiveFetchSnackbar] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null); // New state for selected bot
  
  // Restore user session from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Optionally decode token to get username, or fetch user info from backend
      // For now, just set a placeholder user
      setUser('logged-in');
      setView('dashboard');
    }
  }, []);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleSelectBot = (bot) => {
  setSelectedBot(bot);
  localStorage.setItem('selectedBot', JSON.stringify(bot)); // Save to localStorage
  setView('dashboard');
  };

  useEffect(() => {
    const savedBot = localStorage.getItem('selectedBot');
    if (savedBot) {
      setSelectedBot(JSON.parse(savedBot));
    }
  }, []);

  const handleMenuItemClick = (view) => {
    setView(view);
    handleMenuClose();
  };

  useEffect(()=> {
    let cancelled = false;
    const check = async () => {
      try {
        // Try proxied path first
        let res = await fetch('/healthz', { cache:'no-store' });
        if (!res.ok && window.location.hostname === 'localhost') {
          // Fallback direct to 8090 if proxy misconfigured
            try { res = await fetch('http://localhost:8090/healthz', { cache:'no-store' }); } catch {}
        }
        if (cancelled) return;
        if (res.ok) setHealth({ status:'ok', ts:Date.now(), fails:0 }); else setHealth(h => { const fails=(h.fails||0)+1; if (fails===3) setShowHealthWarn(true); return { status:'error', ts:Date.now(), fails }; });
      } catch {
        if (!cancelled) setHealth(h => { const fails=(h.fails||0)+1; if (fails===3) setShowHealthWarn(true); return { status:'error', ts:Date.now(), fails }; });
      }
    };
    check();
    const id = setInterval(check, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Automation: Periodically fetch live data every minute when user is logged in
  useEffect(() => {
    if (!user) return;
    const fetchLive = async () => {
      try {
  const res = await fetch('/fetch_live_data', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
          setLiveFetchStatus('success');
        } else {
          setLiveFetchStatus('error');
        }
      } catch {
        setLiveFetchStatus('error');
      }
      setShowLiveFetchSnackbar(true);
    };
    fetchLive();
    const intervalId = setInterval(fetchLive, 60000);
    return () => { clearInterval(intervalId); };
  }, [user]);
  
  const handleGetStarted = () => {  if (!user) {
    setView('login');
  } else {
    setView('news');  
  }
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
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor:'pointer' }} onClick={()=>setView('landing')}>
                  Aetherion Trading Engine
                </Typography>
                <Box>
                  <Button color="inherit" onClick={()=>setView('about')} sx={{ mr:1 }}>About</Button> 
                  <Button color="inherit" onClick={()=>setView('contact')} sx={{ mr:1 }}>Contact</Button>
                  <Button color="inherit" onClick={()=>setView('news')} sx={{ mr:1 }}>News</Button>
                  {user ? (
                    <>
                      <Button color="inherit" onClick={()=>setView('account')} sx={{ mr:1 }}>Account</Button>
                      <Button color="inherit" onClick={()=>setView('bots_free')} sx={{ mr:1 }}>Bots</Button>
                      <Button color="inherit" onClick={handleMenuClick} sx={{ mr: 1 }}>Simulator</Button>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                      >
                        <MenuItem onClick={() => handleMenuItemClick('dashboard')}>Dashboard</MenuItem>
                        <MenuItem onClick={() => handleMenuItemClick('backtest')}>Backtesting</MenuItem>
                        <MenuItem onClick={() => handleMenuItemClick('operations')}>Operations</MenuItem>
                      </Menu>
                      <Button color="inherit" onClick={()=> { setUser(null); setSelectedBot(null); localStorage.removeItem('authToken'); localStorage.removeItem('selectedBot'); setView('landing'); }}>Logout</Button>
                      {user.role === 'superuser' && (
                        <Button color="inherit" onClick={()=>setView('developBot')}>Develop Bot</Button>
                      )}
                    </>
                  ) : (
                    <Button color="inherit" onClick={()=>setView('login')}>Login</Button>
                  )}
                </Box>
                <Box sx={{ ml:2 }}>
                  <Tooltip title={health.status==='ok' ? 'Backend healthy' : health.status==='error' ? 'Backend unreachable' : 'Checking backend health'}>
                    <Box sx={{ width:14, height:14, borderRadius:'50%', bgcolor: health.status==='ok' ? '#4caf50' : health.status==='error' ? '#f44336' : 'warning.main', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {health.status==='unknown' && <CircularProgress size={10} />}
                    </Box>
                  </Tooltip>
                </Box>
                {!user && view !== 'landing' && (
                  <Button color="inherit" onClick={()=>setView('landing')}>Home</Button>
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
              <Login onAuth={(u)=> { setUser(u); setView('pricing'); }} onBack={() => setView('landing')} />
            </Box>
          )}
          {view === 'pricing' && <PricingPage setView={setView} />}
          {user && view === 'dashboard' && (
            <div style={{ padding: '24px' }}>
              <TradingDashboard user={user} selectedBot={selectedBot} setUser={setUser} setView={setView} />
            </div>
          )}
          {user && view === 'backtest' && (
            <div style={{ padding: '24px' }}>
              <BacktestRunner />
            </div>
          )}
          {user && view === 'operations' && (
            <div style={{ padding: '24px' }}>
              <TradingOperations onNavigate={setView} selectedBot={selectedBot} />
            </div>
          )}
          {user && view === 'bots_free' && (
            <div style={{ padding: '24px' }}>
              <BotsFreePage onNavigate={setView} onSelectBot={handleSelectBot} selectedBot={selectedBot} />
            </div>
          )}
          
          {user && (user.role === 'superuser' || user.role === 'admin') && view === 'developBot' && (
            <div style={{ padding: '24px' }}>
              <DevelopBotPage onNavigate={setView} />
            </div>
          )}
          {user && view === 'account' && (
            <div style={{ padding: '24px' }}>
              <AccountPage
                user={user}
                onLogout={() => {
                  setUser(null);
                  setSelectedBot(null);
                  localStorage.removeItem('selectedBot'); 
                  localStorage.removeItem('authToken');
                  setView('landing');
                }}
              />
            </div>
          )}
          {view === 'about' && <AboutPage />} 
          {view === 'contact' && <ContactPage />}
          {view === 'news' && <NewsPage />}
        </div>
        <Snackbar open={showHealthWarn} autoHideDuration={6000} onClose={()=>setShowHealthWarn(false)} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
          <Alert severity="warning" variant="filled" onClose={()=>setShowHealthWarn(false)}>
            Backend health failing. Check server or network.
          </Alert>
        </Snackbar>
        {/* <Snackbar open={showLiveFetchSnackbar} autoHideDuration={3000} onClose={()=>setShowLiveFetchSnackbar(false)} anchorOrigin={{ vertical:'bottom', horizontal:'left' }}>
          <Alert severity={liveFetchStatus==='success' ? 'success' : 'error'} variant="filled" onClose={()=>setShowLiveFetchSnackbar(false)}>
            {liveFetchStatus==='success' ? 'Live price fetched and saved!' : 'Live price fetch failed.'}
          </Alert>
        </Snackbar> */}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
