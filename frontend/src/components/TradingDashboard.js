import React, { useState, useEffect } from 'react';
import { Container, Box, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';
import OhlcPriceChart from './OhlcPriceChart';
import CryptoScanner from './CryptoScanner';
import ServerMomentum from './ServerMomentum';
import SymbolManager from './SymbolManager';
import RecentTrades from './RecentTrades';
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
          const fallback = [
  'BTC-USD', 'ETH-USD', 'XRP-USD', 'BNB-USD', 'SOL-USD',  'ADA-USD', 'DOGE-USD', 
  'TRX-USD', 'LINK-USD',
  'DOT-USD', 'MATIC-USD', 'TON-USD', 'SHIB-USD', 'DAI-USD', 'BCH-USD',
  'LTC-USD', 'NEAR-USD'
];
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
          <Typography variant="body1"><strong>Strategy:</strong> {selectedBot.strategy}</Typography>
          <Typography variant="body1"><strong>Status:</strong> {selectedBot.isActive ? 'Running' : 'Stopped'}</Typography>
        </Box>
      )}

      <Box>
        {selectedBot && selectedBot.id
          ? (
              <>
                {console.log('Rendering RecentTrades for bot:', selectedBot)}
                <RecentTrades bot={selectedBot} />
              </>
            )
          : (
              <>
                {console.log('No bot selected, showing message')}
                <Typography sx={{ p: 2 }}>No bot selected.</Typography>
              </>
            )
        }
      </Box>
      <Box sx={{ display:'grid', gap:3, gridTemplateColumns: { xs:'1fr' }, alignItems:'start' }}>

        <Box sx={{ display:'grid', gap:3, gridTemplateColumns:{ xs:'1fr' }, minWidth:0 }}>
          <Box sx={{ height: '600px' }}>
            {momentumMode === 'client' && <CryptoScanner symbols={symbols} onSelect={(sym)=> setSelected(sym)} />}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default TradingDashboard;