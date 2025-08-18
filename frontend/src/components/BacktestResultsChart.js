
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
import { Box, Typography } from '@mui/material';

// Register required scales and elements for Chart.js v3+
Chart.register(CategoryScale, LinearScale, PointElement, LineElement);

export default function BacktestResultsChart({ equityCurve }) {
  if (!equityCurve || equityCurve.length === 0) return null;
  const data = {
    labels: equityCurve.map(e => e.timestamp),
    datasets: [
      {
        label: 'Equity',
        data: equityCurve.map(e => e.equity),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.2,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Equity Curve' },
    },
    scales: {
      x: { display: false },
      y: { beginAtZero: true },
    },
  };
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">Equity Curve</Typography>
      <Line data={data} options={options} />
    </Box>
  );
}
