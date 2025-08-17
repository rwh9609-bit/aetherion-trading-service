import React, { useState } from 'react';
import { Line, Scatter } from 'react-chartjs-2';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';

const BacktestResultsChart = ({ symbol = "BTCUSD", params = {} }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runBacktest = () => {
    setLoading(true); setError(null);
    fetch('/api/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, params })
    })
      .then(res => res.json())
      .then(json => { setResults(json); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">Backtest Results</Typography>
      <Button variant="contained" onClick={runBacktest} disabled={loading}>Run Backtest</Button>
      {loading && <CircularProgress sx={{ ml:2 }} />}
      {error && <Alert severity="error">{error}</Alert>}
      {results && Array.isArray(results.equity_curve) && Array.isArray(results.trades) ? (
        <>
          <Line
            data={{
              labels: results.equity_curve.map(e => e.timestamp),
              datasets: [{
                label: 'Equity Curve',
                data: results.equity_curve.map(e => e.equity),
                borderColor: 'green',
                fill: false,
              }]
            }}
          />
          <Scatter
            data={{
              datasets: [{
                label: 'Trades',
                data: results.trades.filter(t => t && typeof t.price === 'number' && t.timestamp).map(t => ({
                  x: t.timestamp,
                  y: t.price,
                })),
                backgroundColor: results.trades.map(t => t.side === 'BUY' ? 'blue' : 'red'),
              }]
            }}
            options={{
              scales: {
                x: { type: 'category', title: { display: true, text: 'Time' } },
                y: { title: { display: true, text: 'Price' } }
              }
            }}
          />
        </>
      ) : (
        <Typography>No valid backtest results to display.</Typography>
      )}
    </Box>
  );
};

export default BacktestResultsChart;