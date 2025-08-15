import React, { useState, useEffect } from 'react';
import { Container, Box } from '@mui/material';
import PriceChart from './PriceChart';
import CryptoScanner from './CryptoScanner';
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
    <Container maxWidth="xl" sx={{ mt:4, mb:4 }}>
  <Box sx={{ display:'grid', gap:3, gridTemplateColumns: { xs:'1fr', lg:'1.2fr 1fr' }, alignItems:'start' }}>
        <Box sx={{ gridColumn:'1 / -1' }}>
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
  <Box sx={{ display:'grid', gap:3, order:{ xs:2, lg:1 }, gridTemplateColumns:{ xs:'1fr', sm:'repeat(auto-fit,minmax(280px,1fr))' }, minWidth:0 }}>
          <RiskMetrics />
          <CryptoScanner symbols={symbols} onSelect={(sym)=> setSelected(sym)} />
        </Box>
  <Box sx={{ order:{ xs:1, lg:2 }, minWidth:0 }}>
          <PriceChart symbol={selected} />
        </Box>
  <Box sx={{ display:'grid', gap:3, gridTemplateColumns:{ xs:'1fr', md:'1fr 1fr' }, gridColumn:'1 / -1', minWidth:0 }}>
          <StrategyControl />
          <OrderBook />
        </Box>
      </Box>
    </Container>
  );
};

export default TradingDashboard;
