import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Divider, Grid } from '@mui/material';
import { streamBotState } from '../services/grpcClient';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function BotView({ bot }) {
  const [botState, setBotState] = useState(bot || null);
  const [history, setHistory] = useState(() => {
    if (bot && bot.botId) {
      const saved = localStorage.getItem(`bot_history_${bot.botId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const signalCounts = history.reduce((acc, entry) => {
    const signal = (entry.signal || '').toUpperCase();
    if (signal === "BUY") acc.buy += 1;
    else if (signal === "SELL") acc.sell += 1;
    else if (signal === "HOLD") acc.hold += 1;
    return acc;
  }, { buy: 0, sell: 0, hold: 0 });

  useEffect(() => {
    if (!bot || !bot.botId) {
      setBotState(bot || null);
      return;
    }
    const handleStateUpdate = (newState) => {
      setBotState(prevBotState => ({ ...prevBotState, ...newState }));
      setHistory(prev => {
        const entry = {
          signal: newState.state?.last_signal || '',
          zscore: Number(newState.state?.zscore) || 0,
          price: Number(newState.state?.price) || 0,
          size: Number(newState.state?.size) || 0,
          account_value: Number(newState.state?.account_value) || Number(newState.accountValue) || 0,
          timestamp: newState.state?.timestamp || Date.now()/1000,
        };
        const updated = [entry, ...prev].slice(0, 1000);
        localStorage.setItem(`bot_history_${bot.botId}`, JSON.stringify(updated));
        return updated;
      });
    };
    const handleError = (error) => {
      console.error('Error streaming bot state:', error);
    };
    const cleanup = streamBotState(bot.botId, handleStateUpdate, handleError);
    return () => {
      cleanup();
    };
  }, [bot]);

  if (!botState) return <Box sx={{ p:2 }}><Typography>Loading...</Typography></Box>;

  const state = botState.state && Object.keys(botState.state).length > 0 ? botState.state : botState;
  const hasLiveState = !!state.last_signal || !!state.zscore || !!state.price;
  const filteredHistory = history.filter(entry => (entry.signal || '').toUpperCase() !== "HOLD").slice(0, 10);

  return (
    <Box sx={{ p: 2, maxWidth: '100%', boxSizing: 'border-box' }}>
      <Grid container spacing={2}>
        {/* Row 1: Bot Info & Live Metrics */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb:1 }}>
              Bot: {botState.name || botState.bot_name || "N/A"}
            </Typography>
            <Typography variant="body2"><strong>Strategy:</strong> {botState.strategy || "N/A"}</Typography>
            <Typography variant="body2"><strong>Symbol:</strong> {botState.symbol || "N/A"}</Typography>
            <Typography variant="body2"><strong>Status:</strong> {botState.isActive ? "running" : "stopped"}</Typography>
            <Typography variant="body2"><strong>Initial Account Value:</strong> {state.initial_account_value || botState.initialAccountValue || "N/A"}</Typography>
            <Typography variant="body2"><strong>Current Account Value:</strong> {state.current_account_value || botState.currentAccountValue || "N/A"}</Typography>
            <Typography variant="body2"><strong>Account Value:</strong> {state.account_value || botState.accountValue || "N/A"}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          {hasLiveState && (
            <Box sx={{ p:2, bgcolor: "#212121", borderRadius: 2, color: "#fff", height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600}>Live Metrics</Typography>
              <Typography variant="body2">Signal: <strong>{state.last_signal}</strong></Typography>
              <Typography variant="body2">Z-Score: <strong>{state.zscore}</strong></Typography>
              <Typography variant="body2">Price: <strong>{state.price}</strong></Typography>
              <Typography variant="body2">Size: <strong>{state.size}</strong></Typography>
              <Typography variant="body2">Timestamp: <strong>{state.timestamp ? new Date(Number(state.timestamp) * 1000).toLocaleTimeString() : '-'}</strong></Typography>
              <Divider sx={{ my:1, bgcolor: "#555" }} />
              <Typography variant="body2">
                <strong>Buys:</strong> {signalCounts.buy} &nbsp;
                <strong>Sells:</strong> {signalCounts.sell} &nbsp;
                <strong>Holds:</strong> {signalCounts.hold}
              </Typography>
            </Box>
          )}
        </Grid>

        {/* Row 2: Recent Trades Table */}
        <Grid item xs={12}>
          {hasLiveState ? (
            <Box sx={{ height: '100%' }}>
              <Typography variant="body2" sx={{ mb:1, fontWeight:600 }}>Recent Signals & Metrics</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Signal</TableCell>
                    <TableCell>Z-Score</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{entry.timestamp ? new Date(Number(entry.timestamp) * 1000).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>{entry.signal}</TableCell>
                      <TableCell>{entry.zscore}</TableCell>
                      <TableCell>{entry.size}</TableCell>
                      <TableCell>{entry.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mt:2, color: 'text.secondary' }}>
              No live state available. Start the bot to see trading signals and metrics.
            </Typography>
          )}
        </Grid>

        {/* Row 3: Account Value Graph */}
        {history.length > 1 && (
          <Grid item xs={12}>
            <Box sx={{ mt: 4, width: '100%' }}>
              <Divider sx={{ my:2 }} />
              <Typography variant="subtitle1" fontWeight={600}>Account Value Over Time</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={[...history].reverse()}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#43a047" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#43a047" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" tickFormatter={ts => new Date(ts * 1000).toLocaleTimeString()} />
                  <YAxis />
                  <Tooltip labelFormatter={ts => new Date(ts * 1000).toLocaleTimeString()} />
                  <Area type="monotone" dataKey="account_value" stroke="#43a047" fillOpacity={1} fill="url(#colorUv)" name="Account Value" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default BotView;