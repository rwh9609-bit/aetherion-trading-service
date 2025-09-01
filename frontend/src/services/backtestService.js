export async function runBacktest(params) {
  // params should be: { symbol, strategy_definition }
  const response = await fetch('/backtest/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: params.symbol || 'BTCUSD',
      strategy_definition: params.strategy_definition || {}
    })
  });
  if (!response.ok) throw new Error('Backtest failed');
  return await response.json();
}