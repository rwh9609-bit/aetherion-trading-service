import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Button } from '@mui/material';
import BacktestResultsChart from './BacktestResultsChart';

export default function LivePriceChart({ symbol = 'BTCUSD' }) {
  // Normalize symbol to BTCUSD format for API requests
  const normalizedSymbol = symbol.replace(/[-_]/g, '').toUpperCase();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/fetch_live_data?symbol=${normalizedSymbol}`, { method: 'POST' });
        const json = await res.json();
        if (!cancelled) {
          if (json.error) {
          // Reload chart data after successful fetch
          if (typeof fetchData === 'function') {
            fetchData();
          }
            setData(json.data || []);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    const intervalId = setInterval(fetchData, 60000); // refresh every minute
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [normalizedSymbol]);
  // Expose fetchData for manual reload after download
  const fetchData = async () => {
    setLoading(true);
    let cancelled = false;
    try {
      const res = await fetch(`/marketdata?symbol=${normalizedSymbol}`);
      const json = await res.json();
      if (json.status === 'error') {
        setData([]);
      } else {
        setData(json.data || []);
      }
    } catch {
      setData([]);
    }
    if (!cancelled) setLoading(false);
    return () => { cancelled = true; };
  };
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(intervalId);
  }, [normalizedSymbol]);

  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadMsg(null);
    try {
  const res = await fetch(`http://localhost:8000/fetch_live_data?symbol=${normalizedSymbol}`, { method: 'POST' });
      const json = await res.json();
      if (json.status === 'success') {
        setDownloadMsg('Live price fetched and saved!');
      } else {
        setDownloadMsg(json.error || 'Download failed.');
      }
    } catch (e) {
      setDownloadMsg('Download failed.');
    }
    setDownloading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }} elevation={3}>
      <Typography variant="h6" gutterBottom>
        Live Price Chart ({normalizedSymbol})
      </Typography>
      <Button variant="contained" color="primary" onClick={handleDownload} disabled={downloading} sx={{ mb:2 }}>
        {downloading ? 'Downloading...' : `Download Live Price for ${normalizedSymbol}`}
      </Button>
      {downloadMsg && <Typography color={downloadMsg.includes('failed') ? 'error' : 'success'} sx={{ mb:2 }}>{downloadMsg}</Typography>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <BacktestResultsChart equityCurve={data.map(d => ({ timestamp: d.timestamp, equity: d.price }))} />
      )}
    </Paper>
  );
}
