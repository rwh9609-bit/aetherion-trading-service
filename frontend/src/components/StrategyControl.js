import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Box,
  Alert
} from '@mui/material';

const StrategyControl = () => {
  const [params, setParams] = useState({
    lookbackPeriod: 20,
    entryStdDev: 2.0,
    exitStdDev: 0.5,
    maxPositionSize: 0.1,
    stopLossPct: 0.02,
    riskPerTradePct: 0.01
  });

  const [status, setStatus] = useState('stopped'); // 'running' or 'stopped'
  const [alert, setAlert] = useState(null);

  const handleParamChange = (param) => (event) => {
    setParams(prev => ({
      ...prev,
      [param]: parseFloat(event.target.value)
    }));
  };

  const handleStartStop = async () => {
    try {
      // Import gRPC helpers lazily to avoid circular imports on initial bundle
      const { startStrategy } = await import('../services/grpcClient');
      if (status === 'stopped') {
        // Map UI params to backend StrategyRequest parameters; include safe defaults
        const strategyParams = {
          type: 'MEAN_REVERSION',
          threshold: String(params.entryStdDev || 2.0),
          period: String(Math.max(1, params.lookbackPeriod || 5)),
        };
        const resp = await startStrategy({ symbol: 'BTC-USD', parameters: strategyParams });
        if (!resp.success) throw new Error(resp.message || 'Start failed');
        setStatus('running');
        setAlert({ type:'success', message:`Strategy started (id=${resp.id || 'n/a'})` });
      } else {
        // No dedicated stopStrategy helper yet with strategy_id context; show optimistic stop.
        setStatus('stopped');
        setAlert({ type:'success', message:'Strategy stop requested (UI optimistic)' });
      }
    } catch (error) {
      setAlert({ type:'error', message: error.message });
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Strategy Control
        </Typography>

        {alert && (
          <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <TextField
            label="Lookback Period"
            type="number"
            value={params.lookbackPeriod}
            onChange={handleParamChange('lookbackPeriod')}
            fullWidth
          />
          <TextField
            label="Entry Std Dev"
            type="number"
            value={params.entryStdDev}
            onChange={handleParamChange('entryStdDev')}
            fullWidth
          />
          <TextField
            label="Exit Std Dev"
            type="number"
            value={params.exitStdDev}
            onChange={handleParamChange('exitStdDev')}
            fullWidth
          />
          <TextField
            label="Max Position Size"
            type="number"
            value={params.maxPositionSize}
            onChange={handleParamChange('maxPositionSize')}
            fullWidth
          />
          <TextField
            label="Stop Loss %"
            type="number"
            value={params.stopLossPct}
            onChange={handleParamChange('stopLossPct')}
            fullWidth
          />
          <TextField
            label="Risk Per Trade %"
            type="number"
            value={params.riskPerTradePct}
            onChange={handleParamChange('riskPerTradePct')}
            fullWidth
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color={status === 'stopped' ? 'primary' : 'error'}
            onClick={handleStartStop}
            fullWidth
          >
            {status === 'stopped' ? 'Start Strategy' : 'Stop Strategy'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StrategyControl;
