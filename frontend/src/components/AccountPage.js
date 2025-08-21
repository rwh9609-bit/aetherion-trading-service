import React from 'react';
import { Card, CardContent, Typography, Button, Divider, Stack } from '@mui/material';
import { setAuthToken } from '../services/grpcClient';

const AccountPage = ({ user, onLogout }) => {
  const logout = () => {
    setAuthToken(null);
    onLogout();
  };
  return (
    <Card sx={{ maxWidth: 640, margin: '32px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Account</Typography>
        <Divider sx={{ mb:2 }}/>
        <Typography variant="subtitle1" sx={{ mb:1 }}>Username</Typography>
        <Typography variant="body1" sx={{ mb:2 }}>{user.username}</Typography>
        {user.email && (
          <>
            <Typography variant="subtitle1" sx={{ mb:1 }}>Email</Typography>
            <Typography variant="body1" sx={{ mb:2 }}>{user.email}</Typography>
          </>
        )}
        {user.createdAt && (
          <>
            <Typography variant="subtitle1" sx={{ mb:1 }}>Registered</Typography>
            <Typography variant="body2" sx={{ mb:2 }}>
              {new Date(user.createdAt).toLocaleString()}
            </Typography>
          </>
        )}
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="primary" onClick={logout}>Log out</Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AccountPage;