import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
      const endpoint = status === 'stopped' ? '/api/strategy/start' : '/api/strategy/stop';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) throw new Error('Failed to update strategy status');

      setStatus(status === 'stopped' ? 'running' : 'stopped');
      setAlert({
        type: 'success',
        message: `Strategy ${status === 'stopped' ? 'started' : 'stopped'} successfully`
      });
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message
      });
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
