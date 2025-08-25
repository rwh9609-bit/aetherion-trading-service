import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Card, CardContent, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress, Alert } from '@mui/material';
import { listBots, startBot, stopBot, getBotStatus, deleteBot } from '../services/grpcClient';

const statusColor = (active) => active ? 'success.main' : 'text.secondary';

const BotsFreePage = () => {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [viewBot, setViewBot] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const botsToShow = bots.length > 0 ? bots : [];

  const refresh = async () => {
  console.log('[BotsFreePage] refresh called');
  setLoading(true);
  setError(null);
  try {
    const resp = await listBots();
    if (!resp.botsList || resp.botsList.length === 0) {
      setBots([
        {
          botId: 'example-bot-1',
          name: 'Example Bot',
          symbol: 'BTC-USD',
          strategy: 'MEAN_REVERSION',
          isActive: false,
          parameters: { lookback: 20, threshold: 0.5 },
        }
      ]);
    } else {
      setBots(resp.botsList);
    }
  } catch (e) {
    setError(e.message || 'Failed to load bots');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    refresh();
  }, []);

  const handleStart = async (id) => {
    setActionBusy(id);
    try {
      await startBot(id);
      await refresh();
    } finally {
      setActionBusy(null);
    }
  };

  const handleStop = async (id) => {
    setActionBusy(id);
    try {
      await stopBot(id);
      await refresh();
    } finally {
      setActionBusy(null);
    }
  };

  const handleView = async (bot) => {
    try {
      const status = await getBotStatus(bot.botId);
      setViewBot(status);
    } catch {
      setViewBot(bot);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bot?')) return;
    setActionBusy(id);
    try {
      await deleteBot(id);
      setAlert({ type: 'success', msg: 'Bot deleted' });
      if (selectedBot && selectedBot.botId === id) {
        setSelectedBot(null);
      }
      await refresh();
    } catch (e) {
      setAlert({ type: 'error', msg: e.message || 'Failed to delete bot' });
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt:4, mb:4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:3, flexWrap:'wrap', gap:2 }}>
        <Typography variant="h5" fontWeight={600}>Bots</Typography>
      </Stack>

      {alert && <Alert severity={alert.type} sx={{ mb:2 }} onClose={()=>setAlert(null)}>{alert.msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
      
      <Box sx={{ display:'grid', gap:2, gridTemplateColumns:{ xs:'1fr', sm:'1fr 1fr', md:'1fr 1fr 1fr' } }}>
        {botsToShow.map(bot => (
          <Card
            key={bot.botId}
            variant="outlined"
            sx={{
              borderColor: selectedBot && selectedBot.botId === bot.botId ? 'primary.main' : 'rgba(255,255,255,0.1)',
              borderWidth: selectedBot && selectedBot.botId === bot.botId ? '2px' : '1px',
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>{String(bot.name || bot.strategy || "Unnamed Bot")}</Typography>
              <Typography variant="caption" color="text.secondary">ID: {String(bot.botId || "N/A")}</Typography>
              <Box sx={{ mt:1, display:'flex', flexDirection:'column', gap:0.5 }}>
                <Typography variant="body2"><strong>Symbol:</strong> {bot.symbol}</Typography>
                <Typography variant="body2"><strong>Strategy:</strong> {bot.strategy}</Typography>
                <Typography variant="body2" sx={{ color: statusColor(bot.isActive) }}><strong>Status:</strong> {bot.isActive ? 'running' : 'stopped'}</Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt:2 }}>
                <Button size="small" variant="outlined" onClick={()=>handleView(bot)}>View</Button>
                {!bot.isActive ? (
                  <Button size="small" variant="contained" color="success" disabled={actionBusy===bot.botId} onClick={()=>handleStart(bot.botId)}>{actionBusy===bot.botId? '...':'Start'}</Button>
                ) : (
                  <Button size="small" variant="contained" color="warning" disabled={actionBusy===bot.botId} onClick={()=>handleStop(bot.botId)}>{actionBusy===bot.botId? '...':'Stop'}</Button>
                )}
                <Button
                  size="small"
                  variant={selectedBot && selectedBot.botId === bot.botId ? "contained" : "outlined"}
                  onClick={() => setSelectedBot(bot)}
                >
                  {selectedBot && selectedBot.botId === bot.botId ? "Selected" : "Select"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={actionBusy===bot.botId}
                  onClick={() => handleDelete(bot.botId)}
                >
                  Delete
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
      {loading && <Box sx={{ mt:4, display:'flex', justifyContent:'center' }}><CircularProgress size={32} /></Box>}
      <Dialog open={!!viewBot} onClose={()=>setViewBot(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Bot Details</DialogTitle>
        <DialogContent dividers>
          {viewBot && (
            <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
              <Typography variant="body2"><strong>ID:</strong> {viewBot.botId}</Typography>
              <Typography variant="body2"><strong>Name:</strong> {viewBot.name}</Typography>
              <Typography variant="body2"><strong>Symbol:</strong> {viewBot.symbol}</Typography>
              <Typography variant="body2"><strong>Strategy:</strong> {viewBot.strategy}</Typography>
              <Typography variant="body2"><strong>Status:</strong> <Chip size="small" color={viewBot.isActive? 'success':'default'} label={viewBot.isActive? 'running':'stopped'} /></Typography>
              <Typography variant="subtitle2" sx={{ mt:1 }}>Parameters</Typography>
              <Box component="pre" sx={{ p:1, bgcolor:'rgba(255,255,255,0.05)', borderRadius:1, fontSize:12, maxHeight:180, overflow:'auto' }}>{JSON.stringify(viewBot.parameters || {}, null, 2)}</Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setViewBot(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BotsFreePage;