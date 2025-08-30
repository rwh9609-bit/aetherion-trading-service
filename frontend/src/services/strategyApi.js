export async function backtestStrategy(blocks) {
  const resp = await fetch('/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });
  return resp.json();
}

export async function deployStrategy(blocks) {
  const resp = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });
  return resp.json();
}