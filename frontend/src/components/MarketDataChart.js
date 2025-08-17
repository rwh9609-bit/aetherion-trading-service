import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

const MarketDataChart = ({ symbol = "BTCUSD" }) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/marketdata?symbol=${symbol}`)
      .then(res => res.json())
      .then(json => { setData(json.data || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [symbol]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!Array.isArray(data) || !data.length) return <Typography>No market data available.</Typography>;

  // Defensive: filter out any malformed entries
  const safeData = data.filter(d => d && typeof d.price === 'number' && d.timestamp);
  if (!safeData.length) return <Typography>No valid market data to display.</Typography>;

  const chartData = {
    labels: safeData.map(d => d.timestamp),
    datasets: [
      {
        label: `${symbol} Price`,
        data: safeData.map(d => d.price),
        borderColor: 'blue',
        fill: false,
      }
    ]
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">{symbol} Market Data</Typography>
      <Line data={chartData} />
    </Box>
  );
};

export default MarketDataChart;