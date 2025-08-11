import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { fetchPrice } from '../services/grpcClient';

const PriceChart = ({ symbol = 'BTC-USD' }) => {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        const data = await fetchPrice(symbol);
        
        setPriceData(prevData => {
          const newData = [...prevData, {
            time: new Date().toLocaleTimeString(),
            price: data.price
          }];
          
          // Keep last 50 data points
          return newData.slice(-50);
        });
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPriceData();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchPriceData, 5000);

    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {symbol} Price Chart
        </Typography>
        <Box sx={{ width: '100%', height: 300 }}>
          <LineChart
            width={600}
            height={300}
            data={priceData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#8884d8" 
              isAnimationActive={false}
            />
          </LineChart>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
