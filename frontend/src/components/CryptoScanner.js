import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, Chip, Tooltip, LinearProgress, TableContainer } from '@mui/material';
import { streamPrice } from '../services/grpcClient';

function stddev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  const variance = values.reduce((a,b)=>a + Math.pow(b-mean,2),0) / values.length;
  return Math.sqrt(variance);
}

function computeMetrics(series, now=Date.now()) {
  if (!series || series.length < 2) return null;
  const cutoff5m = now - 5*60*1000;
  const cutoff1m = now - 60*1000;
  const recent = series.filter(pt => pt.t >= cutoff5m);
  if (recent.length < 2) return null;
  let price1m = null, price5m = recent[0].price; 
  for (let i=recent.length-1;i>=0;i--) {
    if (recent[i].t <= cutoff1m) { price1m = recent[i].price; break; }
  }
  const last = recent[recent.length-1].price;
  const pctChange1m = price1m ? ((last - price1m)/price1m)*100 : null;
  const pctChange5m = price5m ? ((last - price5m)/price5m)*100 : null;
  const logRets = [];
  for (let i=1;i<recent.length;i++) {
    const prev = recent[i-1].price; const cur = recent[i].price;
    if (prev>0 && cur>0) logRets.push(Math.log(cur/prev));
  }
  const vol = stddev(logRets) * Math.sqrt( (60*60*24) / (5*60) );
  const momentumScore = (pctChange1m || 0) * 0.7 + (pctChange5m || 0) * 0.3 - (vol*100)*0.5;
  return { last, pctChange1m, pctChange5m, vol, momentumScore };
}

const formatPct = (v) => v === null || v === undefined ? '—' : `${v.toFixed(2)}%`;
const formatPrice = (p) => p === null || p === undefined ? '—' : p.toFixed(2);

const CryptoScanner = ({ symbols, onSelect }) => {
  const dataRef = useRef({});
  const streamsRef = useRef({});
  const [metrics, setMetrics] = useState([]);
  const [initializing, setInitializing] = useState(true);

  const recompute = useCallback(() => {
    const now = Date.now();
    const rows = symbols.map(sym => {
      const series = dataRef.current[sym] || [];
      dataRef.current[sym] = series.filter(pt => pt.t >= now - 5*60*1000);
      const m = computeMetrics(dataRef.current[sym], now);
      return { symbol: sym, ...m };
    }).filter(r => r);
    rows.sort((a,b)=> (b.momentumScore||-Infinity) - (a.momentumScore||-Infinity));
    setMetrics(rows);
  }, [symbols]);

  useEffect(() => {
    let cancelled = false;
    setInitializing(true);
    const setup = () => {
      Object.keys(streamsRef.current).forEach(sym => {
        if (!symbols.includes(sym)) {
          streamsRef.current[sym]();
          delete streamsRef.current[sym];
          delete dataRef.current[sym];
        }
      });
      symbols.forEach(sym => {
        if (!streamsRef.current[sym]) {
          dataRef.current[sym] = dataRef.current[sym] || [];
          const cleanup = streamPrice(sym, (tick) => {
            if (cancelled) return;
            dataRef.current[sym].push({ t: Date.now(), price: tick.price });
            if (dataRef.current[sym].length > 600) dataRef.current[sym].splice(0, dataRef.current[sym].length - 600);
            recompute();
            setInitializing(false);
          }, (err) => { console.error('Stream error for', sym, err); });
          streamsRef.current[sym] = cleanup;
        }
      });
    };
    setup();
    const interval = setInterval(()=>{ recompute(); }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      Object.values(streamsRef.current).forEach(fn => fn());
      streamsRef.current = {};
    };
  }, [symbols, recompute]);

  const top = metrics[0];

  return (
    <Paper elevation={3} sx={{ p:2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6">Opportunity Scanner</Typography>
        {top && (
          <Tooltip title="Highest composite short-term momentum score (1m & 5m change minus volatility penalty)">
            <Chip color="success" label={`Top: ${top.symbol}`} size="small" onClick={()=>onSelect && onSelect(top.symbol)} />
          </Tooltip>
        )}
      </Box>
      {initializing && <LinearProgress sx={{ mb:1 }} />}
  <TableContainer sx={{ maxHeight: 240, overflow: 'auto', borderRadius: 1 }}>
  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', minWidth: 500 }}>
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">1m %</TableCell>
            <TableCell align="right">5m %</TableCell>
            <TableCell align="right">Vol (σ)</TableCell>
            <TableCell align="right">Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metrics.map(row => {
            const pos = (row.momentumScore||0) > 0;
            return (
              <TableRow key={row.symbol} hover onClick={()=>onSelect && onSelect(row.symbol)} sx={{ cursor:'pointer' }}>
                <TableCell>{row.symbol}</TableCell>
                <TableCell align="right">{formatPrice(row.last)}</TableCell>
                <TableCell align="right" style={{ color: row.pctChange1m>0?'#4caf50':'#ef5350' }}>{formatPct(row.pctChange1m)}</TableCell>
                <TableCell align="right" style={{ color: row.pctChange5m>0?'#4caf50':'#ef5350' }}>{formatPct(row.pctChange5m)}</TableCell>
                <TableCell align="right">{row.vol ? row.vol.toFixed(3) : '—'}</TableCell>
                <TableCell align="right" style={{ fontWeight: row===top ? 600:400, color: pos?'#4caf50':'#ef5350' }}>{row.momentumScore?.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
          {!metrics.length && !initializing && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ fontStyle:'italic' }}>Collecting data...</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        Heuristic ranking only. Not financial advice. Uses short-term price momentum adjusted for volatility.
      </Typography>
    </Paper>
  );
};

export default CryptoScanner;
