import React, { useState, useEffect } from 'react';
import { botClient, createMetadata } from '../services/grpcClient';
import { TradeHistoryRequest } from '../proto/trading_api_pb';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

const RecentTrades = ({ bot }) => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (!bot || !bot.id) return;
    const fetchTrades = () => { 
      const request = new TradeHistoryRequest();
      request.setUserId(bot.id);

      botClient.getTradeHistory(request, createMetadata(), (err, response) => {
        if (err) {
          console.error('Error fetching trade history:', err);
          return;
        }
        setTrades(response.getTradesList());
      });
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);

    return () => clearInterval(interval);
  }, [bot?.id]);

  // Guard after hooks
  if (!bot || !bot.id) {
    return <Typography sx={{ p: 2 }}>No bot selected.</Typography>;
  }

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