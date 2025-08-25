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
        // Pass bot info to fetchRiskMetrics
        const data = await fetchRiskMetrics(bot);
        setMetrics({
          valueAtRisk: data.valueAtRisk || 0,
          positionSize: data.positionSize || 0,
          accountValue: data.accountValue || 0,
          dailyPnL: data.dailyPnL || 0,
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
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, [bot]);

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
        {/* Advanced Metrics Section */}
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>
            Advanced Risk Metrics
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Simulation Mode: <b>{metrics.simulationMode}</b>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Last Update: {metrics.lastUpdate}
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
