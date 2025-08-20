import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Card, CardContent, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress, Alert } from '@mui/material';
import { listBots, startBot, stopBot, getBotStatus } from '../services/grpcClient';

const statusColor = (active) => active ? 'success.main' : 'text.secondary';

const BotsPage = ({ onNavigate }) => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewBot, setViewBot] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true); setError(null);
      const resp = await listBots();
      setBots(resp.botsList || []);
    } catch(e) {
      setError(e.message || 'Failed to load bots');
    } finally { setLoading(false); }
  };
  useEffect(()=> {
    refresh();
    const id = setInterval(refresh, 8000); // auto-refresh every 8s
    return () => clearInterval(id);
  }, []);

  const handleStart = async (id) => { setActionBusy(id); try { await startBot(id); await refresh(); } finally { setActionBusy(null); } };
  const handleStop = async (id) => { setActionBusy(id); try { await stopBot(id); await refresh(); } finally { setActionBusy(null); } };
  const handleView = async (bot) => { try { const status = await getBotStatus(bot.botId); setViewBot(status); } catch { setViewBot(bot); } };

  return (
    <Container maxWidth="lg" sx={{ mt:4, mb:4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:3, flexWrap:'wrap', gap:2 }}>
        <Typography variant="h5" fontWeight={600}>Bots</Typography>
        <Button variant="contained" size="small" onClick={()=> onNavigate && onNavigate('developBot')}>Develop Bot</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
      <Box sx={{ display:'grid', gap:2, gridTemplateColumns:{ xs:'1fr', sm:'1fr 1fr', md:'1fr 1fr 1fr' } }}>
        {bots.map(bot => (
          <Card key={bot.botId} variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.1)' }}>
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
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
      {loading && <Box sx={{ mt:4, display:'flex', justifyContent:'center' }}><CircularProgress size={32} /></Box>}
      {!loading && !bots.length && (
        <Card sx={{ mt:4 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">No bots yet. Click "Develop Bot" to create your first automated strategy.</Typography>
          </CardContent>
        </Card>
      )}
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

export default BotsPage;