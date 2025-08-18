import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Box, Tooltip, CircularProgress, Snackbar, Alert } from '@mui/material';
import TradingDashboard from './components/TradingDashboard';

import TradingOperations from './components/TradingOperations';
import BotsPage from './components/BotsPage';
import DevelopBotPage from './components/DevelopBotPage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import NewsPage from './components/NewsPage';
import Login from './components/Login';
import AccountPage from './components/AccountPage';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import BacktestRunner from './components/BacktestRunner';
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
  const res = await fetch('http://localhost:8000/fetch_live_data', { method: 'POST' });
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
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor:'pointer' }} onClick={()=>setView('landing')}>
                  Aetherion Trading Engine
                </Typography>
                <Box>
                  <Button color="inherit" onClick={()=>setView('about')} sx={{ mr:1 }}>About</Button>
                  <Button color="inherit" onClick={()=>setView('news')} sx={{ mr:1 }}>News</Button>
                  <Button color="inherit" onClick={()=>setView('contact')} sx={{ mr:1 }}>Contact</Button>
                  {user && <Button color="inherit" onClick={()=>setView('backtest')} sx={{ mr:2 }}>Backtesting</Button>}

                  {user ? (
                    <>
                      <Button color="inherit" onClick={()=>setView('account')} sx={{ mr:1 }}>Account</Button>
                      <Button color="inherit" onClick={()=>setView('dashboard')} sx={{ mr:1 }}>Dashboard</Button>
                      <Button color="inherit" onClick={()=>setView('operations')} sx={{ mr:1 }}>Simulator</Button>
                      <Button color="inherit" onClick={()=>setView('bots')} sx={{ mr:1 }}>Bots</Button>
                      <Button color="inherit" onClick={()=>setView('developBot')} sx={{ mr:1 }}>Develop Bot</Button>
                      <Button color="inherit" onClick={()=> { setUser(null); setView('landing'); }}>Logout</Button>
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
              <Login onAuth={(u)=> { setUser(u); setView('dashboard'); }} onBack={() => setView('landing')} />
            </Box>
          )}
          {user && view === 'dashboard' && (
            <div style={{ padding: '24px' }}>
              <TradingDashboard />
            </div>
          )}
          {user && view === 'backtest' && (
            <div style={{ padding: '24px' }}>
              <BacktestRunner />
            </div>
          )}
          {user && view === 'operations' && (
            <div style={{ padding: '24px' }}>
              <TradingOperations onNavigate={setView} />
            </div>
          )}
          {user && view === 'bots' && (
            <div style={{ padding: '24px' }}>
              <BotsPage onNavigate={setView} />
            </div>
          )}
          {user && view === 'developBot' && (
            <div style={{ padding: '24px' }}>
              <DevelopBotPage onNavigate={setView} />
            </div>
          )}
          {user && view === 'account' && (
            <div style={{ padding: '24px' }}>
              <AccountPage user={user} onLogout={() => { setUser(null); setView('landing'); }} />
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
        <Snackbar open={showLiveFetchSnackbar} autoHideDuration={3000} onClose={()=>setShowLiveFetchSnackbar(false)} anchorOrigin={{ vertical:'bottom', horizontal:'left' }}>
          <Alert severity={liveFetchStatus==='success' ? 'success' : 'error'} variant="filled" onClose={()=>setShowLiveFetchSnackbar(false)}>
            {liveFetchStatus==='success' ? 'Live price fetched and saved!' : 'Live price fetch failed.'}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
