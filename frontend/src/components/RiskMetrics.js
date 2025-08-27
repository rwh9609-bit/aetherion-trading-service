import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { fetchRiskMetrics } from '../services/grpcClient';

const RiskMetrics = ({ bot }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bot) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await fetchRiskMetrics(bot);
        setMetrics({
          ...data,
          valueAtRisk: data.valueAtRisk || 0,
          assetNames: data.assetNames || [],
          correlationMatrix: data.correlationMatrix || [],
          volatilityPerAsset: data.volatilityPerAsset || [],
          simulationMode: data.simulationMode || '',
          lastUpdate: data.lastUpdate || '',
        });
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Fetched every 30s, more reasonable

    return () => clearInterval(interval);
  }, [bot]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!metrics || !bot) return null;

  // Extract base currency from symbol (e.g., BTC from BTC/USD)
  const baseCurrency = bot.symbol ? bot.symbol.split('/')[0] : '';
  const positionSize = bot.portfolio && bot.portfolio[baseCurrency] ? bot.portfolio[baseCurrency].amount : 0;
  const accountValue = bot.accountValue || bot.state?.account_value || 0;

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
              {positionSize.toFixed(4)} {baseCurrency}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Account Value
            </Typography>
            <Typography variant="h6">
              ${accountValue.toFixed(2)}
            </Typography>
          </Box>
        </Box>
        {/* Advanced Metrics Section */}
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>
            Advanced Risk Metrics
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Simulation Mode: <b>{metrics.simulationMode}</b>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Last Update: {new Date(metrics.lastUpdate).toLocaleString()}
          </Typography>
          {/* Correlation Matrix Table */}
          {metrics.assetNames.length > 0 && metrics.correlationMatrix.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2">Asset Correlations</Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr>
                    <th></th>
                    {metrics.assetNames.map((name, idx) => (
                      <th key={idx} style={{ border: '1px solid #ccc', padding: 4 }}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.assetNames.map((rowName, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{rowName}</td>
                      {metrics.assetNames.map((_, j) => (
                        <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>
                          {metrics.correlationMatrix[i * metrics.assetNames.length + j].toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
          {/* Volatility Table */}
          {metrics.assetNames.length > 0 && metrics.volatilityPerAsset.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2">Per-Asset Volatility</Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Volatility</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.assetNames.map((name, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{name}</td>
                      <td style={{ border: '1px solid #ccc', padding: 4 }}>{metrics.volatilityPerAsset[i].toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RiskMetrics;
