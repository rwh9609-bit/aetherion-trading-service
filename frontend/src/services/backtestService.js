// Simple service to call the backtest API
export async function runBacktest(params) {
  const response = await fetch('/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!response.ok) throw new Error('Backtest failed');
  return await response.json();
}
