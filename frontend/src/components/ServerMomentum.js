import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, LinearProgress, TableContainer } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getMomentum } from '../services/grpcClient';

const formatPct = v => v === null || v === undefined ? '—' : `${v.toFixed(2)}%`;
const formatPrice = p => p === null || p === undefined ? '—' : p.toFixed(2);

const ServerMomentum = ({ onSelect }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const resp = await getMomentum([]); // { metricsList: [...], generatedAtUnixMs }
      const list = resp.metricsList || [];
      // Transform field names (protobuf camelCase mapping)
      list.sort((a,b)=> (b.momentumScore||-Infinity) - (a.momentumScore||-Infinity));
      setRows(list);
      setLastUpdated(new Date(resp.generatedAtUnixMs || Date.now()));
    } catch (e) {
      setError(e.message || 'Failed to load momentum');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const top = rows[0];

  return (
    <Paper elevation={3} sx={{ p:2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6">Server Momentum</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {lastUpdated && (
            <Tooltip title={`Generated at ${lastUpdated.toLocaleTimeString()}`}>
              <Typography variant="caption" color="text.secondary">{lastUpdated.toLocaleTimeString()}</Typography>
            </Tooltip>
          )}
          <Tooltip title="Refresh now">
            <span>
              <IconButton size="small" onClick={load} disabled={loading}>
                <RefreshIcon fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      {loading && <LinearProgress sx={{ mb:1 }} />}
      {error && <Typography color="error" variant="body2" sx={{ mb:1 }}>{error}</Typography>}
      <TableContainer sx={{ maxHeight: 260, overflow: 'auto', borderRadius: 1, width:'100%', overflowX:'auto' }}>
        <Table size="small" stickyHeader sx={{ tableLayout:'fixed', minWidth: 600 }}>
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
            {rows.map(r => {
              const pos = (r.momentumScore||0) > 0;
              return (
                <TableRow key={r.symbol} hover onClick={()=> onSelect && onSelect(r.symbol)} sx={{ cursor:'pointer' }}>
                  <TableCell sx={{ whiteSpace:'nowrap' }}>{r.symbol}</TableCell>
                  <TableCell align="right">{formatPrice(r.lastPrice)}</TableCell>
                  <TableCell align="right" sx={{ color: r.pctChange1M>0?'#4caf50':'#ef5350' }}>{formatPct(r.pctChange1M)}</TableCell>
                  <TableCell align="right" sx={{ color: r.pctChange5M>0?'#4caf50':'#ef5350' }}>{formatPct(r.pctChange5M)}</TableCell>
                  <TableCell align="right">{r.volatility ? r.volatility.toFixed(3) : '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: r===top ? 600:400, color: pos?'#4caf50':'#ef5350' }}>{r.momentumScore?.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
            {!rows.length && !loading && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ fontStyle:'italic' }}>No data</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        Server aggregated momentum (1m/5m) with volatility penalty.
      </Typography>
    </Paper>
  );
};

export default ServerMomentum;
