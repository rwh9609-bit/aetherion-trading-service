import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, Stack, Typography, Chip, Tooltip, Fade, ToggleButton, ToggleButtonGroup, LinearProgress, Box } from '@mui/material';

const BAR_INTERVAL_MS = 5000;
const HISTORY_WINDOW_MS = 30 * 60 * 1000;
const MIN_BARS = 10;

const OhlcPriceChart = ({ symbol }) => {
  const activeSymbol = symbol && symbol.trim() ? symbol : 'BTC-USD';
  const [bars, setBars] = useState([]); // { bucket, open, high, low, close }
  const [mode, setMode] = useState('candles');
  const [streamState, setStreamState] = useState('connecting');
  const streamStateRef = useRef(streamState);
  useEffect(()=> { streamStateRef.current = streamState; }, [streamState]);
  const [animKey, setAnimKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const receivedRef = useRef(false);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const prevSymbolRef = useRef();

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = containerRef.current;
      setDims({ w: clientWidth, h: clientHeight });
    });
    ro.observe(containerRef.current);
    setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setAnimKey(k => k + 1);
    setBars([]);
    setStreamState('connecting');
    setLoading(true);
    receivedRef.current = false;
    let cancelled = false;
    let cleanup;

    const upsert = (price, ts) => {
      const bucket = Math.floor(ts / BAR_INTERVAL_MS) * BAR_INTERVAL_MS;
      setBars(prev => {
        const arr = [...prev];
        let last = arr[arr.length - 1];
        if (!last || last.bucket !== bucket) {
          last = { bucket, open: price, high: price, low: price, close: price };
          arr.push(last);
        } else {
          last.high = Math.max(last.high, price);
          last.low = Math.min(last.low, price);
          last.close = price;
        }
        const cutoff = Date.now() - HISTORY_WINDOW_MS;
        while (arr.length && arr[0].bucket < cutoff) arr.shift();
        return arr;
      });
    };

    // Seed with one REST snapshot (retry once if it fails) so user sees price instantly
    (async () => {
      const attemptFetch = async (retry=false) => {
        try {
          const snap = await fetchPrice(activeSymbol);
          if (!cancelled && snap && typeof snap.price === 'number') {
            upsert(snap.price, Date.now());
            if (streamStateRef.current === 'connecting') setStreamState('live');
            setLoading(false);
            return true;
          }
        } catch (e) {
          if (!retry) return false; // give up after retry
        }
        return false;
      };
      const ok = await attemptFetch(false);
      if (!ok) {
        // retry after short delay
        setTimeout(() => {
          attemptFetch(true);
        }, 1200);
      }
    })();
    return () => { cancelled = true; cleanup && cleanup(); };
  }, [activeSymbol]);

  // Fallback: if bars exist but still marked connecting after a grace period, promote to live.
  useEffect(() => {
    if (streamStateRef.current !== 'connecting') return;
    if (!bars.length) return; // nothing yet
    const id = setTimeout(() => {
      if (streamStateRef.current === 'connecting' && bars.length) {
        setStreamState('live');
        setLoading(false);
      }
    }, 2500);
    return () => clearTimeout(id);
  }, [bars.length]);

  const renderStatusChip = () => {
    let color = 'default', label = '';
    switch (streamState) {
      case 'connecting': color = 'info'; label = 'Connecting'; break;
      case 'live': color = 'success'; label = 'Live'; break;
      case 'error': color = 'error'; label = 'Error'; break;
      default: label = streamState;
    }
    const chip = <Chip size="small" color={color} label={label} />;
    if (streamState === 'connecting') return <Tooltip title="Waiting for ticks">{chip}</Tooltip>;
    if (streamState === 'error') return <Tooltip title="Stream error">{chip}</Tooltip>;
    return chip;
  };

  // Compute scale
  const lows = bars.map(b => b.low);
  const highs = bars.map(b => b.high);
  const minY = lows.length ? Math.min(...lows) : 0;
  const maxY = highs.length ? Math.max(...highs) : 1;
  const pad = (maxY - minY) * 0.05 || 0.5;
  const yMin = minY - pad;
  const yMax = maxY + pad;
  const scaleY = (val) => {
    if (yMax === yMin) return dims.h / 2;
    return (1 - (val - yMin) / (yMax - yMin)) * (dims.h - 20) + 10; // padding top/bot
  };

  // X layout
  const visible = bars.slice(-Math.max(MIN_BARS, bars.length));
  const cw = dims.w;
  const barWidth = visible.length ? Math.max(4, Math.min(16, cw / visible.length * 0.6)) : 6;
  const gap = visible.length ? (cw - barWidth * visible.length) / (visible.length + 1) : 0;

  const linePath = () => {
    if (!visible.length) return '';
    return visible.map((b, i) => {
      const x = gap + barWidth / 2 + i * (barWidth + gap);
      const y = scaleY(b.close);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  };

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Fade in key={animKey} timeout={300}>
              <Typography variant="h6" sx={{ mb: 0 }}>{activeSymbol} {mode === 'candles' ? 'Candles' : 'Line'}</Typography>
            </Fade>
            {renderStatusChip()}
          </Stack>
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(e, v) => v && setMode(v)}>
            <ToggleButton value="candles">Candles</ToggleButton>
            <ToggleButton value="line">Line</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        <Box ref={containerRef} sx={{ width: '100%', height: 320, position: 'relative' }}>
          <svg width={dims.w} height={dims.h} style={{ position: 'absolute', inset: 0 }}>
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
              const y = 10 + f * (dims.h - 20);
              return <line key={f} x1={0} x2={cw} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
            })}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
              const y = 10 + f * (dims.h - 20);
              const val = (yMax - (yMax - yMin) * f).toFixed(2);
              return <text key={f} x={cw - 4} y={y - 2} fontSize={10} fill="#888" textAnchor="end">{val}</text>;
            })}
            {mode === 'candles' && visible.map((b, i) => {
              const x = gap + i * (barWidth + gap) + barWidth / 2;
              const up = b.close >= b.open;
              const color = up ? '#26a69a' : '#ef5350';
              const openY = scaleY(b.open);
              const closeY = scaleY(b.close);
              const highY = scaleY(b.high);
              const lowY = scaleY(b.low);
              const bodyTop = Math.min(openY, closeY);
              const bodyH = Math.max(2, Math.abs(closeY - openY));
              return (
                <g key={b.bucket}>
                  <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth={1} />
                  <rect x={x - barWidth / 2} y={bodyTop} width={barWidth} height={bodyH} fill={color} stroke={color} />
                </g>
              );
            })}
            {mode === 'line' && (
              <path d={linePath()} fill="none" stroke="#8884d8" strokeWidth={2} />
            )}
          </svg>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          OHLC bars from live ticks (5s interval, 30m window). Illustration only.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OhlcPriceChart;