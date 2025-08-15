import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Chip, Stack, Tooltip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { fetchPrice, streamPrice } from '../services/grpcClient';

const PriceChart = ({ symbol: initialSymbol = 'BTC-USD' }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamState, setStreamState] = useState('connecting'); // connecting | live | snapshot | error

  const receivedFirstTickRef = useRef(false);
  useEffect(() => {
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
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap:2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              {symbol} Price Chart
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="symbol-select-label">Symbol</InputLabel>
              <Select
                labelId="symbol-select-label"
                value={symbol}
                label="Symbol"
                onChange={(e) => { setPriceData([]); setStreamState('connecting'); setSymbol(e.target.value); }}
              >
                <MenuItem value="BTC-USD">BTC-USD</MenuItem>
                <MenuItem value="ETH-USD">ETH-USD</MenuItem>
                <MenuItem value="SOL-USD">SOL-USD</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          {renderStatusChip()}
        </Stack>
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
            <RechartsTooltip />
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
