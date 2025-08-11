import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { fetchRiskMetrics } from '../services/grpcClient';

const RiskMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        console.log('Fetching risk metrics...');
        const data = await fetchRiskMetrics();
        console.log('Risk metrics data:', data);
        setMetrics({
          valueAtRisk: data.valueAtRisk || 0,
          positionSize: data.positionSize || 0,
          accountValue: data.accountValue || 0,
          dailyPnL: data.dailyPnL || 0,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching risk metrics:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!metrics) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Risk Metrics
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Value at Risk (95%)
            </Typography>
            <Typography variant="h6">
              ${metrics.valueAtRisk.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Position Size
            </Typography>
            <Typography variant="h6">
              {metrics.positionSize.toFixed(4)} BTC
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Account Value
            </Typography>
            <Typography variant="h6">
              ${metrics.accountValue.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Daily P&L
            </Typography>
            <Typography variant="h6" color={metrics.dailyPnL >= 0 ? 'success.main' : 'error.main'}>
              ${metrics.dailyPnL.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskMetrics;
