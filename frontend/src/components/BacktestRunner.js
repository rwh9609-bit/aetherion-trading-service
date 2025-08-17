
import React, { useState } from 'react';
import { runBacktest } from '../services/backtestService';
import BacktestResultsChart from './BacktestResultsChart';

export default function BacktestRunner() {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [params, setParams] = useState({ lookback_period: 20, entry_std_dev: 2.0, exit_std_dev: 0.5 });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runBacktest({ symbol, params });
      setResults(res);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-800 p-8 rounded-2xl shadow-lg max-w-xl mx-auto mt-8">
      <h2 className="text-3xl font-extrabold mb-6 text-blue-400">Run Backtest</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-1 font-semibold">Symbol</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value)} className="bg-gray-700 text-white p-2 rounded w-full" />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Lookback Period</label>
          <input type="number" value={params.lookback_period} onChange={e => setParams(p => ({ ...p, lookback_period: +e.target.value }))} className="bg-gray-700 text-white p-2 rounded w-full" />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Entry Std Dev</label>
          <input type="number" value={params.entry_std_dev} onChange={e => setParams(p => ({ ...p, entry_std_dev: +e.target.value }))} className="bg-gray-700 text-white p-2 rounded w-full" />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Exit Std Dev</label>
          <input type="number" value={params.exit_std_dev} onChange={e => setParams(p => ({ ...p, exit_std_dev: +e.target.value }))} className="bg-gray-700 text-white p-2 rounded w-full" />
        </div>
      </div>
      <button onClick={handleRun} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg mt-2 transition-transform transform hover:scale-105">Run Backtest</button>
      {loading && <div className="mt-4 text-yellow-400">Running...</div>}
      {error && <div className="mt-4 text-red-400">Error: {error}</div>}
      {results && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2 text-emerald-400">Results</h3>
          <div className="mb-2">Trades: <span className="font-mono text-blue-300">{results.trades.length}</span></div>
          <div className="mb-2">Equity Curve Points: <span className="font-mono text-blue-300">{results.equity_curve.length}</span></div>
          <BacktestResultsChart equityCurve={results.equity_curve} />
        </div>
      )}
    </div>
  );
}
