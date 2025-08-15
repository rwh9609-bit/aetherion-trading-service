import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Typography, Alert, Box, Tabs, Tab } from '@mui/material';
import { loginUser, registerUser } from '../services/grpcClient';

const Login = ({ onAuth }) => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn = mode === 'login' ? loginUser : registerUser;
      const res = await fn(username, password);
      if (!res.success) {
        setError(res.message || 'Authentication failed');
      } else {
        if (mode === 'register') {
          // Auto-login after register
          const loginRes = await loginUser(username, password);
          if (!loginRes.success) {
            setError(loginRes.message || 'Auto-login failed');
            setLoading(false);
            return;
          }
        }
        onAuth(username);
      }
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 420, margin: '48px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom align="center">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Typography>
        <Tabs value={mode} onChange={(_, v) => setMode(v)} centered sx={{ mb: 2 }}>
          <Tab label="Login" value="login" />
          <Tab label="Register" value="register" />
        </Tabs>
        {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
        <Box component="form" onSubmit={submit} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          <TextField label="Username" value={username} onChange={e=>setUsername(e.target.value)} required autoFocus />
          <TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? (mode === 'login' ? 'Signing in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Login;
