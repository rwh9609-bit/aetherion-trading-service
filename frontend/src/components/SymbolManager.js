import React, { useState } from 'react';
import { Box, TextField, Button, Stack, Chip, Typography } from '@mui/material';
import { addSymbol as rpcAddSymbol, removeSymbol as rpcRemoveSymbol } from '../services/grpcClient';

const normalize = (s) => s.trim().toUpperCase();

const SymbolManager = ({ symbols, onAdd, onRemove, selected, onSelect, disabled=false, loadError }) => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    const sym = normalize(input);
    if (!sym) return;
    if (symbols.includes(sym)) { setError('Already added'); return; }
    setBusy(true); setError(null);
    try {
      const resp = await rpcAddSymbol(sym);
      if (!resp.success) { setError(resp.message || 'Add failed'); }
      else { onAdd(sym); setInput(''); }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (sym) => {
    setBusy(true); setError(null);
    try {
      const resp = await rpcRemoveSymbol(sym);
      if (!resp.success) { setError(resp.message || 'Remove failed'); }
      else { onRemove(sym); }
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <TextField size="small" label="Add Symbol" value={input} onChange={e=>{ setInput(e.target.value); setError(null); }} disabled={busy || disabled} />
    <Button type="submit" variant="contained" size="small" disabled={busy || disabled || !input.trim()}>Add</Button>
    {(error || loadError) && <Typography color="error" variant="caption">{error || loadError}</Typography>}
      </form>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
        {symbols.map(sym => (
          <Chip
            key={sym}
            label={sym + (sym === selected ? ' *' : '')}
            color={sym === selected ? 'primary' : 'default'}
      onClick={() => !disabled && onSelect(sym)}
      onDelete={(!disabled && symbols.length > 1) ? () => handleRemove(sym) : undefined}
            size="small"
            sx={{ cursor:'pointer' }}
          />
        ))}
    {disabled && !symbols.length && <Typography variant="caption">Loading symbols...</Typography>}
      </Stack>
    </Box>
  );
};

export default SymbolManager;
