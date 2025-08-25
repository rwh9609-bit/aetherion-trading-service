import React, { useState, useEffect } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, Box } from '@mui/material';
import { listOrders } from '../services/grpcClient';

const RecentOrders = ({ user, bot }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !bot) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    const fetchOrders = async () => {
      setLoading(true); setError(null);
      try {
        // Use getOrdersList() for class-based gRPC objects
        console.log('Fetching orders for bot:', bot); 
        const resp = await listOrders({ bot_id: bot.botId, limit: 20, offset: 0 });
        const ordersArr = resp.getOrdersList ? resp.getOrdersList() : [];
        if (!cancelled) setOrders(ordersArr);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, bot]);

  if (!bot) return null;

  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Recent Orders for <strong>{bot.name}</strong>
      </Typography>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ px: 2, pb: 2 }}>{error}</Typography>
      )}
      <Table size="small" aria-label="recent orders">
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Side</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Requested</TableCell>
            <TableCell align="right">Filled</TableCell>
            <TableCell align="right">Limit</TableCell>
            <TableCell align="right">Stop</TableCell>
            <TableCell align="right">Created</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map(order => (
            <TableRow key={order.getId()}>
              <TableCell>{order.getSymbol()}</TableCell>
              <TableCell>{order.getSide()}</TableCell>
              <TableCell>{order.getType()}</TableCell>
              <TableCell>{order.getStatus()}</TableCell>
              <TableCell align="right">{order.getQuantityRequested()?.getUnits() ?? 0}</TableCell>
              <TableCell align="right">{order.getQuantityFilled()?.getUnits() ?? 0}</TableCell>
              <TableCell align="right">{order.getLimitPrice()?.getUnits() ?? '-'}</TableCell>
              <TableCell align="right">{order.getStopPrice()?.getUnits() ?? '-'}</TableCell>
              <TableCell align="right">{order.getCreatedAt() ? new Date(order.getCreatedAt().getSeconds() * 1000).toLocaleString() : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!loading && orders.length === 0 && (
        <Typography sx={{ px: 2, py: 2 }} color="text.secondary">
          No recent orders for this bot.
        </Typography>
      )}
    </TableContainer>
  );
};

export default RecentOrders;