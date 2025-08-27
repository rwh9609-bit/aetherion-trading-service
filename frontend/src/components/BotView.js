import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { streamBotState } from '../services/grpcClient';

function BotView({ bot }) {
  const [botState, setBotState] = useState(bot || null);
  const [holdCount, setHoldCount] = useState(0);

  useEffect(() => {
    if (!bot || !bot.botId) {
      console.warn('[BotView] Invalid bot or botId:', bot);
      setBotState(bot || null);
      return;
    }

    const handleStateUpdate = (newState) => {
      console.log("Streamed bot state:", newState);
      setBotState({ ...bot, ...Object.fromEntries(Object.entries(newState).filter(([_, v]) => v !== '' && v !== null && v !== undefined)) });
      if (newState.state && newState.state.last_signal === "hold") {
        setHoldCount(count => count + 1);
      }
    };

    const handleError = (error) => {
      console.error('Error streaming bot state:', error);
    };

    const cleanup = streamBotState(bot.botId, handleStateUpdate, handleError);

    return () => {
      cleanup();
    };
  }, [bot]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes flash {
        0% { opacity: 1; }
        50% { opacity: 0.2; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!botState) return <Box sx={{ p:2 }}><Typography>Loading...</Typography></Box>;

  const state = botState.state && Object.keys(botState.state).length > 0 ? botState.state : botState;
  const hasLiveState = !!state.last_signal || !!state.zscore || !!state.price;

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb:1 }}>
        Bot: {botState.name || botState.bot_name || "N/A"}
      </Typography>
      <Typography variant="body2"><strong>Strategy:</strong> {botState.strategy || "N/A"}</Typography>
      <Typography variant="body2"><strong>Symbol:</strong> {botState.symbol || "N/A"}</Typography>
      <Typography variant="body2"><strong>Status:</strong> {botState.isActive ? "running" : "stopped"}</Typography>
      <Typography variant="body2"><strong>Account Value:</strong> {state.account_value || botState.accountValue || "N/A"}</Typography>
      {hasLiveState ? (
        <>
          <Typography variant="body2" sx={{ display:'flex', alignItems:'center', gap:1 }}>
            <strong>Last Signal:</strong> {state.last_signal || "N/A"}
            {state.last_signal === "hold" && (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 40%, #ff1744 70%, #b71c1c 100%)',
                    boxShadow: '0 0 8px 2px #ff1744',
                    marginLeft: 8,
                    animation: 'flash 1s infinite'
                  }}
                />
                <Chip
                  label={`Hold count: ${holdCount}`}
                  color="error"
                  size="small"
                  sx={{ ml:1, fontWeight:600, bgcolor:'#ffebee', color:'#b71c1c' }}
                />
              </>
            )}
          </Typography>
          <Typography variant="body2"><strong>Z-Score:</strong> {state.zscore || "N/A"}</Typography>
          <Typography variant="body2"><strong>Size:</strong> {state.size || "N/A"}</Typography>
          <Typography variant="body2"><strong>Price:</strong> {state.price || "N/A"}</Typography>
          <Typography variant="body2">
            <strong>Timestamp:</strong> {state.timestamp ? new Date(Number(state.timestamp) * 1000).toLocaleString() : "N/A"}
          </Typography>
        </>
      ) : (
        <Typography variant="body2" sx={{ mt:2, color: 'text.secondary' }}>
          No live state available. Start the bot to see trading signals and metrics.
        </Typography>
      )}
    </Box>
  );
}

export default BotView;