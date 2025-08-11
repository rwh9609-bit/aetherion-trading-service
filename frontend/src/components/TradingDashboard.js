import React, { useEffect } from 'react';
import { Container, Grid } from '@mui/material';
import PriceChart from './PriceChart';
import StrategyControl from './StrategyControl';
import RiskMetrics from './RiskMetrics';
import OrderBook from './OrderBook';

console.log('TradingDashboard component loaded');

const TradingDashboard = () => {
  console.log('Rendering TradingDashboard');
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Risk Metrics */}
        <Grid xs={12}>
          <RiskMetrics />
        </Grid>
        
        {/* Price Chart */}
        <Grid xs={12}>
          <PriceChart />
        </Grid>
        
        {/* Strategy Control */}
        <Grid xs={12} sm={6}>
          <StrategyControl />
        </Grid>
        
        {/* Order Book */}
        <Grid item xs={12} md={6}>
          <OrderBook />
        </Grid>
      </Grid>
    </Container>
  );
};

export default TradingDashboard;
