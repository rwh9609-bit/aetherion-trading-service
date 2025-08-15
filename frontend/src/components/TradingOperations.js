import React from 'react';
import { Container, Box, Typography, Breadcrumbs, Link } from '@mui/material';
import RiskMetrics from './RiskMetrics';
import StrategyControl from './StrategyControl';
import OrderBook from './OrderBook';

// Dedicated operations page splitting heavy control & monitoring panels
// away from the main trading dashboard (which focuses on momentum & price chart).
const TradingOperations = ({ onNavigate }) => {
  return (
    <Container maxWidth="xl" sx={{ mt:4, mb:4 }}>
      <Breadcrumbs sx={{ mb:2 }} aria-label="breadcrumb">
        <Link underline="hover" color="inherit" onClick={() => onNavigate && onNavigate('dashboard')} sx={{ cursor:'pointer' }}>Dashboard</Link>
        <Typography color="text.primary">Operations</Typography>
      </Breadcrumbs>
      <Box sx={{ display:'grid', gap:3, gridTemplateColumns:{ xs:'1fr', lg:'1fr 1fr' }, alignItems:'start' }}>
        <RiskMetrics />
        <StrategyControl />
        <Box sx={{ gridColumn:'1 / -1' }}>
          <OrderBook />
        </Box>
      </Box>
    </Container>
  );
};

export default TradingOperations;
