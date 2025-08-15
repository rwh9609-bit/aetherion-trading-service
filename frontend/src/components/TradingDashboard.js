import React, { useState, useEffect } from 'react';
import { Container, Grid } from '@mui/material';
import PriceChart from './PriceChart';
import StrategyControl from './StrategyControl';
import RiskMetrics from './RiskMetrics';
import OrderBook from './OrderBook';
import SymbolManager from './SymbolManager';
import { listSymbols } from '../services/grpcClient';

console.log('TradingDashboard component loaded');

const TradingDashboard = () => {
  // Start with empty; hydrate via backend ListSymbols
  const [symbols, setSymbols] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setLoadError(null);
        const resp = await listSymbols(); // { symbolsList: [...] }
        if (cancelled) return;
        const fetched = resp.symbolsList || [];
        setSymbols(fetched);
        if (fetched.length) {
          // Preserve existing selection if still valid; otherwise pick first
            setSelected(prev => (prev && fetched.includes(prev)) ? prev : fetched[0]);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load symbols:', e);
          setLoadError(e.message || 'Failed to load symbols');
          // Fallback defaults if backend call fails
          const fallback = ['BTC-USD','ETH-USD','SOL-USD'];
          setSymbols(fallback);
          setSelected(fallback[0]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const handleAdd = (s) => { setSymbols(prev => [...prev, s]); setSelected(s); };
  const handleRemove = (s) => {
    setSymbols(prev => prev.filter(x => x !== s));
    if (selected === s && symbols.length > 1) {
      const remaining = symbols.filter(x => x !== s);
      if (remaining.length) setSelected(remaining[0]);
    }
  };
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid xs={12}>
          <SymbolManager
            symbols={symbols}
            onAdd={handleAdd}
            onRemove={handleRemove}
            selected={selected}
            onSelect={setSelected}
            disabled={loading}
            loadError={loadError}
          />
        </Grid>
        <Grid xs={12}>
          <RiskMetrics />
        </Grid>
        <Grid xs={12}>
          <PriceChart symbol={selected} />
        </Grid>
        <Grid xs={12} sm={6}>
          <StrategyControl />
        </Grid>
        <Grid item xs={12} md={6}>
          <OrderBook />
        </Grid>
      </Grid>
    </Container>
  );
};

export default TradingDashboard;
