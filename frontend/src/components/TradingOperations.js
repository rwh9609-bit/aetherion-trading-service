import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Breadcrumbs, Link } from '@mui/material';
import RiskMetrics from './RiskMetrics';

// Dedicated operations page splitting heavy control & monitoring panels
// away from the main trading dashboard (which focuses on momentum & price chart).
const TradingOperations = ({ onNavigate, selectedBot }) => {
  return (
    <Container maxWidth="xl" sx={{ mt:4, mb:4 }}>
      {selectedBot && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Selected Bot:</Typography>
          <Typography variant="body1"><strong>Name:</strong> {selectedBot.name}</Typography>
          <Typography variant="body1"><strong>Symbol:</strong> {selectedBot.symbol}</Typography>
          <Typography variant="body1"><strong>Strategy:</strong> {selectedBot.strategy}</Typography>
          <Typography variant="body1"><strong>Status:</strong> {selectedBot.isActive ? 'Running' : 'Stopped'}</Typography>
        </Box>
      )}
      <Breadcrumbs sx={{ mb:2 }} aria-label="breadcrumb">
        <Link underline="hover" color="inherit" onClick={() => onNavigate && onNavigate('dashboard')} sx={{ cursor:'pointer' }}>Dashboard</Link>
        <Typography color="text.primary">Operations</Typography>
      </Breadcrumbs>
      <Box sx={{ display:'grid', gap:3, gridTemplateColumns:{ xs:'1fr', lg:'1fr 1fr' }, alignItems:'start' }}>
        <RiskMetrics />
      </Box>
    </Container>
  );
};

export default TradingOperations;
