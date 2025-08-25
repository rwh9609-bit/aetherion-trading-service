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
    <Card sx={{ maxWidth: 640, margin: '32px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Welcome, {user.username}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={user.role ? user.role : "user"} color={user.role === "superuser" ? "secondary" : "primary"} />
          {user.subscription && (
            <Chip label={`Subscription: ${user.subscription.status}`} color="success" />
          )}
        </Stack>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Email:</strong> {user.email || "N/A"}
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Registered:</strong>{" "}
          {user.createdAt
            ? new Date(user.createdAt).toLocaleString()
            : "N/A"}
        </Typography>
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