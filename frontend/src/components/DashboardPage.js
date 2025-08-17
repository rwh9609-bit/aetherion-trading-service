import React from 'react';
import MarketDataChart from './MarketDataChart';
import BacktestResultsChart from './BacktestResultsChart';
import { Container, Typography, Box } from '@mui/material';

const DashboardPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt:4, mb:4 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb:3 }}>Dashboard</Typography>
      <Box sx={{ mb:6 }}>
        <MarketDataChart symbol="BTCUSD" />
      </Box>
      <Box>
        <BacktestResultsChart symbol="BTCUSD" params={{}} />
      </Box>
    </Container>
  );
};

export default DashboardPage;
