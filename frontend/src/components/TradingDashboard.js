import React, { useState, useEffect } from 'react';
import { Container, Box, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';
import OhlcPriceChart from './OhlcPriceChart';
import CryptoScanner from './CryptoScanner';
import ServerMomentum from './ServerMomentum';
import SymbolManager from './SymbolManager';
import RecentOrders from './RecentOrders';
import { listSymbols, handleGrpcError } from '../services/grpcClient';

console.log('TradingDashboard component loaded');

const TradingDashboard = ({ user, selectedBot, setUser, setView }) => {
  // Start with empty; hydrate via backend ListSymbols
  const [symbols, setSymbols] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [momentumMode, setMomentumMode] = useState('client'); // 'client' | 'server'

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setLoadError(null);
        const resp = await listSymbols();
        if (cancelled) return;
        const fetched = resp.symbolsList || [];
        setSymbols(fetched);
        if (fetched.length) {
          setSelected(prev => (prev && fetched.includes(prev)) ? prev : fetched[0]);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load symbols:', e);
          setLoadError(e.message || 'Failed to load symbols');
          // Optionally handle gRPC errors here:
          handleGrpcError(e, setUser, setView);
          // Fallback defaults if backend call fails
          const fallback = ['BTC-USD','ETH-USD','SOL-USD','ILV-USD'];
          setSymbols(fallback);
          setSelected(fallback[0]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setUser, setView]);

  const handleAdd = (s) => { setSymbols(prev => [...prev, s]); setSelected(s); };
  const handleRemove = (s) => {
    setSymbols(prev => prev.filter(x => x !== s));
    if (selected === s && symbols.length > 1) {
      const remaining = symbols.filter(x => x !== s);
      if (remaining.length) setSelected(remaining[0]);
    }
  };

  return (
    <Container maxWidth={false} sx={{ mt:4, mb:4 }}>
      {selectedBot && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Selected Bot:</Typography>
          <Typography variant="body1"><strong>Name:</strong> {selectedBot.name}</Typography>
          <Typography variant="body1"><strong>Symbol:</strong> {selectedBot.symbol}</Typography>
          <Typography variant="body1"><strong>Strategy:</strong> {selectedBot.strategy}</Typography>
          <Typography variant="body1"><strong>Status:</strong> {selectedBot.isActive ? 'Running' : 'Stopped'}</Typography>
        </Box>
      )}

      <Box>
        <RecentOrders user={user} bot={selectedBot} />
      </Box>
      <Box sx={{ display:'grid', gap:3, gridTemplateColumns: { xs:'1fr' }, alignItems:'start' }}>
        <Box sx={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column', gap:1 }}>
          <Box sx={{ display:'flex', alignItems:{ xs:'stretch', sm:'center' }, flexWrap:'wrap', gap:2, justifyContent:'space-between' }}>
            <Box sx={{ flex:1, minWidth:260 }}>
              <SymbolManager
                symbols={symbols}
                onAdd={handleAdd}
                onRemove={handleRemove}
                selected={selected}
                onSelect={setSelected}
                disabled={loading}
                loadError={loadError}
              />
            </Box>
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight:600 }}>Momentum:</Typography>
              <ToggleButtonGroup size="small" exclusive value={momentumMode} onChange={(e,v)=> v && setMomentumMode(v)}>
                <ToggleButton value="client">Live</ToggleButton>
                <ToggleButton value="server">Server</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display:'grid', gap:3, gridTemplateColumns:{ xs:'1fr' }, minWidth:0 }}>
          <Box>
            {momentumMode === 'client' && <CryptoScanner symbols={symbols} onSelect={(sym)=> setSelected(sym)} />}
            {momentumMode === 'server' && <ServerMomentum onSelect={(sym)=> setSelected(sym)} />}
          </Box>
          <Box>
            <OhlcPriceChart symbol={selected} />
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default TradingDashboard;