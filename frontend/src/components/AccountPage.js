import React from 'react';
import { Card, CardContent, Typography, Button, Divider, Stack, Chip } from '@mui/material';
import { setAuthToken } from '../services/grpcClient';

const AccountPage = ({ user, onLogout, onGoToPricing }) => {
  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('selectedBot');
    onLogout();
  };

  return (
    <Card sx={{ maxWidth: 600, margin: '32px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Account Overview
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={user.role || "user"} color={user.role === "superuser" ? "secondary" : "primary"} />
          {user.subscription && (
            <Chip label={`Subscription: ${user.subscription.status}`} color="success" />
          )}
        </Stack>
        {user.username && (
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Username:</strong> {user.username}
          </Typography>
        )}
        {user.email && (
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Email:</strong> {user.email}
          </Typography>
        )}
        {user.createdAt && (
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Registered:</strong> {new Date(user.createdAt).toLocaleString()}
          </Typography>
        )}
        {user.subscription && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Plan:</strong> {user.subscription.productName || "N/A"}
            <br />
            <strong>Expires:</strong>{" "}
            {user.subscription.currentPeriodEnd
              ? new Date(user.subscription.currentPeriodEnd * 1000).toLocaleDateString()
              : "N/A"}
          </Typography>
        )}
        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="primary" onClick={onGoToPricing}>
            Manage Subscription
          </Button>
          <Button variant="outlined" color="secondary" onClick={logout}>
            Log out
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AccountPage;