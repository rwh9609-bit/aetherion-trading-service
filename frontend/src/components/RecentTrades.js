import React, { useState, useEffect } from 'react';
import { TradingServiceClient } from '../proto/trading_api_grpc_web_pb';
import { TradeHistoryRequest } from '../proto/trading_api_pb';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

const RecentTrades = ({ user }) => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const fetchTrades = () => {
      const client = new TradingServiceClient('http://localhost:8080');
      const request = new TradeHistoryRequest();
      request.setUserId(user.id);

      client.getTradeHistory(request, {}, (err, response) => {
        if (err) {
          console.error('Error fetching trade history:', err);
          return;
        }
        setTrades(response.getTradesList());
      });
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [user.id]);

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Recent Trades
      </Typography>
      <Table aria-label="recent trades">
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell align="right">Side</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Executed At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.getTradeId()}>
              <TableCell component="th" scope="row">
                {trade.getSymbol()}
              </TableCell>
              <TableCell align="right">{trade.getSide()}</TableCell>
              <TableCell align="right">{trade.getQuantity()}</TableCell>
              <TableCell align="right">{trade.getPrice().toFixed(2)}</TableCell>
              <TableCell align="right">{new Date(trade.getExecutedAt() * 1000).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentTrades;
