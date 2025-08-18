import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { streamOrderBook } from '../services/grpcClient';

const OrderBook = () => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    let retryTimeout;
    let streamCleanup = null;

    const connectStream = () => {
      setLoading(true);
      setError(null);

      return streamOrderBook(
        'BTC-USD',
        (data) => {
          setOrderBook(data);
          setLastUpdate(new Date().toLocaleString());
          setLoading(false);
          retryCount = 0; // Reset retry count on successful data
        },
        (error) => {
          console.error('Stream error:', error);
          setError(`Connection error. Retrying... (${retryCount + 1}/${maxRetries})`);
          setLoading(false);
          
          if (retryCount < maxRetries) {
            retryTimeout = setTimeout(() => {
              retryCount++;
              if (streamCleanup) streamCleanup();
              setError(`Connection error. Retrying... (${retryCount}/${maxRetries})`);
              console.log(`Retrying connection (attempt ${retryCount}/${maxRetries})`);
              streamCleanup = connectStream();
            }, retryDelay * Math.pow(2, retryCount - 1)); // Exponential backoff
          } else {
            setError('Failed to connect after multiple attempts. Please refresh the page.');
          }
        }
      );
    };

    streamCleanup = connectStream();
    return () => {
      clearTimeout(retryTimeout);
      if (streamCleanup) streamCleanup();
    };
  }, []);

  const renderOrders = (orders, type) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Price</TableCell>
            <TableCell align="right">Size</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.slice(0, 10).map((order, index) => (
            <TableRow key={index}>
              <TableCell>
                <Typography color={type === 'asks' ? 'error.main' : 'success.main'}>
                  ${order.price.toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell align="right">{order.size.toFixed(4)}</TableCell>
              <TableCell align="right">${(order.price * order.size).toFixed(2)}</TableCell>
              <TableCell align="right">
                {order.timestamp ? new Date(order.timestamp).toLocaleTimeString() : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) return <Typography>Loading order book...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Order Book
        </Typography>
        {lastUpdate && (
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Last update: {lastUpdate}
          </Typography>
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <Box>
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              Asks
            </Typography>
            {renderOrders(orderBook.asks, 'asks')}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="success.main" gutterBottom>
              Bids
            </Typography>
            {renderOrders(orderBook.bids, 'bids')}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderBook;
