import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Chip, Stack, Tooltip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchPrice, streamPrice } from '../services/grpcClient';

const PriceChart = ({ symbol = 'BTC-USD' }) => {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamState, setStreamState] = useState('connecting'); // connecting | live | snapshot | error

  const receivedFirstTickRef = useRef(false);
  useEffect(() => {
    // reset when symbol changes
    setPriceData([]);
    setStreamState('connecting');
    setLoading(true);
    setError(null);
    let cleanup;
    receivedFirstTickRef.current = false;
    cleanup = streamPrice(symbol, (tick) => {
      receivedFirstTickRef.current = true;
      setStreamState('live');
      setPriceData(prevData => {
        const newData = [...prevData, {
          time: new Date(tick.timestamp || Date.now()).toLocaleTimeString(),
          price: tick.price
        }];
        return newData.slice(-50);
      });
      setLoading(false);
    }, (errMsg) => {
      console.error('Price stream error:', errMsg);
      setError(errMsg);
      setStreamState('error');
      setLoading(false);
    });

  const fallbackTimer = setTimeout(async () => {
      if (!receivedFirstTickRef.current) {
        try {
          const data = await fetchPrice(symbol);
          setPriceData([{ time: new Date().toLocaleTimeString(), price: data.price }]);
      setStreamState('snapshot');
          setLoading(false);
        } catch (e) {
          setError(e.message);
      setStreamState('error');
          setLoading(false);
        }
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      cleanup && cleanup();
    };
  }, [symbol]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  const renderStatusChip = () => {
    let color = 'default';
    let label = '';
    switch (streamState) {
      case 'connecting':
        color = 'info'; label = 'Connecting'; break;
      case 'live':
        color = 'success'; label = 'Live'; break;
      case 'snapshot':
        color = 'warning'; label = 'Snapshot'; break;
      case 'error':
        color = 'error'; label = 'Error'; break;
      default:
        label = streamState;
    }
    const chip = <Chip size="small" color={color} label={label} />;
    if (streamState === 'snapshot') {
      return (
        <Tooltip title="Showing fallback snapshot (no live stream yet)">
          {chip}
        </Tooltip>
      );
    }
    if (streamState === 'connecting') {
      return (
        <Tooltip title="Waiting for first live tick">
          {chip}
        </Tooltip>
      );
    }
    if (streamState === 'error') {
      return (
        <Tooltip title={error || 'Stream error'}>
          {chip}
        </Tooltip>
      );
    }
    return chip; // live
  };

  return (
  <Card sx={{ minWidth:0 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap:2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            {symbol} Price Chart
          </Typography>
          {renderStatusChip()}
        </Stack>
        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" minTickGap={20} />
              <YAxis domain={['auto','auto']} />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#8884d8" isAnimationActive={false} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
