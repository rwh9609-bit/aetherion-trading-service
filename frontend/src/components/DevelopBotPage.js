import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Card, CardContent, Button, Stack, MenuItem, Select, InputLabel, FormControl, Divider, Alert, FormLabel } from '@mui/material';
import { createBot } from '../services/grpcClient';

const symbols = [
  'BTC-USD', 'ETH-USD', 'XRP-USD', 'BNB-USD', 'SOL-USD',  'ADA-USD', 'DOGE-USD', 
  'TRX-USD', 'LINK-USD',
  'DOT-USD', 'MATIC-USD', 'TON-USD', 'SHIB-USD', 'DAI-USD', 'BCH-USD',
  'LTC-USD', 'NEAR-USD'
];

const defaultConfig = {
  name: '',
  description: '',
  symbol: [],
  strategy: 'MEAN_REVERSION',
  lookback: 20,
  entryStd: 2.0,
  exitStd: 0.5,
  maxPos: 0.1,
  stopLossPct: 0.02,
  riskPerTradePct: 0.01,
  accountValue: 1000012 // Default account value, can be overridden by backend
};

const strategies = [
  { value: 'MEAN_REVERSION', label: 'Mean Reversion' },
  { value: 'MOMENTUM', label: 'Momentum' },
  { value: 'PAIR_TRADING', label: 'Pair Trading' },
  { value: 'CUSTOM', label: 'Custom (Python)' }
];

const DevelopBotPage = ({ onNavigate, userId }) => {
  const [cfg, setCfg] = useState(defaultConfig);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const setField = (field) => (e) => setCfg(prev => ({ ...prev, [field]: e.target.value }));

  const toggleSymbol = (symbol) => {
    setCfg(prev => {
      const newSymbols = prev.symbol.includes(symbol)
        ? prev.symbol.filter(s => s !== symbol)
        : [...prev.symbol, symbol];
      return { ...prev, symbol: newSymbols };
    });
  };

  const handleSubmit = async () => {
    if (!cfg.name || cfg.symbol.length === 0) {
      setAlert({ type: 'error', msg: 'Bot Name and at least one Symbol are required.' });
      return;
    }
    setSubmitting(true); setAlert(null);
    try {
      const params = {
        lookback: String(cfg.lookback),
        entryStd: String(cfg.entryStd),
        exitStd: String(cfg.exitStd),
        maxPos: String(cfg.maxPos),
        stopLossPct: String(cfg.stopLossPct),
        riskPerTradePct: String(cfg.riskPerTradePct)
      };
      const payload = {
        user_id: userId,
        name: cfg.name,
        description: cfg.description, // Added description
        symbols: cfg.symbol, // Pass array directly
        strategy_name: cfg.strategy,
        strategy_parameters: params,
        initial_account_value: Number(cfg.accountValue),
        is_live: false, // Default to paper trading
      };
      console.log('[DevelopBotPage] createBot request:', payload);
      const resp = await createBot(payload);
      console.log('[DevelopBotPage] createBot response:', resp);
      if (resp.success) {
        setAlert({ type:'success', msg: `Bot created (id=${resp.id})` });
        setTimeout(()=> onNavigate && onNavigate('bots'), 900);
      } else {
        setAlert({ type:'error', msg: resp.message || 'Failed to create bot' });
      }
    } catch (e) {
      console.error('[DevelopBotPage] createBot error:', e);
      setAlert({ type:'error', msg: e.message || 'Failed to submit' });
    } finally { setSubmitting(false); }
  };

  return (
    <Container maxWidth="md" sx={{ mt:4, mb:6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:3, flexWrap:'wrap', gap:2 }}>
        <Typography variant="h5" fontWeight={600}>Develop Bot</Typography>
        <Button size="small" onClick={()=> onNavigate && onNavigate('bots')}>Back to Bots</Button>
      </Stack>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Configuration</Typography>
          {alert && <Alert severity={alert.type} sx={{ mb:2 }} onClose={()=>setAlert(null)}>{alert.msg}</Alert>}
          <Stack spacing={2}>
            <TextField label="Bot Name" value={cfg.name} onChange={setField('name')} fullWidth required />
            <TextField label="Description" value={cfg.description} onChange={setField('description')} fullWidth multiline rows={2} />
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1, typography: 'subtitle2', fontWeight: 600 }}>Symbols</FormLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {symbols.map((symbol) => (
                  <Button
                    key={symbol}
                    variant={cfg.symbol.includes(symbol) ? 'contained' : 'outlined'}
                    onClick={() => toggleSymbol(symbol)}
                    size="small"
                  >
                    {symbol}
                  </Button>
                ))}
              </Box>
            </FormControl>
            <TextField
              type="number"
              label="Account Value (USD)"
              value={cfg.accountValue}
              onChange={setField('accountValue')}
              fullWidth
              inputProps={{ min: 0, step: 100 }}
            />
            <FormControl fullWidth>
              <InputLabel>Strategy</InputLabel>
              <Select value={cfg.strategy} label="Strategy" onChange={setField('strategy')}>
                {strategies.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            {cfg.strategy === 'MEAN_REVERSION' && (
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                <TextField type="number" label="Lookback" value={cfg.lookback} onChange={setField('lookback')} fullWidth />
                <TextField type="number" label="Entry Std" value={cfg.entryStd} onChange={setField('entryStd')} fullWidth />
                <TextField type="number" label="Exit Std" value={cfg.exitStd} onChange={setField('exitStd')} fullWidth />
              </Stack>
            )}
            {cfg.strategy === 'MOMENTUM' && (
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                <TextField type="number" label="Lookback" value={cfg.lookback} onChange={setField('lookback')} fullWidth />
                <TextField type="number" label="Risk / Trade %" value={cfg.riskPerTradePct} onChange={setField('riskPerTradePct')} fullWidth />
              </Stack>
            )}
            <Divider />
            <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
              <TextField type="number" label="Max Position" value={cfg.maxPos} onChange={setField('maxPos')} fullWidth />
              <TextField type="number" label="Stop Loss %" value={cfg.stopLossPct} onChange={setField('stopLossPct')} fullWidth />
              <TextField type="number" label="Risk / Trade %" value={cfg.riskPerTradePct} onChange={setField('riskPerTradePct')} fullWidth />
            </Stack>
            <Box>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting || !cfg.name || cfg.symbol.length === 0}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt:2 }}>
      Bots are persisted in the backend and available for start/stop from the Bots list.
    </Typography>
    </Container>
  );
};

export default DevelopBotPage;
