import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Typography, Alert, Box, Tabs, Tab, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { loginUser, registerUser } from '../services/grpcClient';

const Login = ({ onAuth, onBack }) => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // <-- Add email state
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const MIN_PASSWORD_LENGTH = 8;

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setPasswordError(false);

    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(true);
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    if (mode === 'register' && !email) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await loginUser(username, password);
      } else {
        res = await registerUser(username, email, password); // <-- Pass email
      }
      if (!res.success) {
        setError(res.message || 'Authentication failed');
      } else {
        if (mode === 'register') {
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
        {onBack && (
          <Button onClick={onBack} sx={{ mb: 2 }}>
            ← Back to Home
          </Button>
        )}
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
          {mode === 'register' && (
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              required
            />
          )}
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            error={passwordError}
            helperText={passwordError ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? (mode === 'login' ? 'Signing in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Login;