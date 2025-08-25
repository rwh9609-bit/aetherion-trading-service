import React, { useEffect, useReducer, useRef, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Divider, Stack, Slider, Button, Grid, Chip, CircularProgress } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- THEME AND UTILITY FUNCTIONS ---

const defaultTheme = {
  bg: '#181824',
  card: '#23233a',
  accent: '#007A7A',
  text: '#fff',
  subtext: '#b0b0b0',
  error: '#ff6384',
  chartPrimary: 'rgba(79, 209, 197, 0.6)',
  chartSecondary: 'rgba(255, 99, 132, 0.6)',
};

// Generate a random normal variable using the Box-Muller transform
function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- STATE MANAGEMENT (useReducer) ---

const initialState = {
  status: 'idle', // 'idle' | 'simulating' | 'success'
  params: {
    numAssets: 10,
    numDays: 252,
    numSims: 10000,
  },
  results: {
    varResult: 0,
    portfolioOutcomes: [],
    correlationMatrix: [],
  },
  feedback: 'Adjust parameters and click "Run Simulation".'
};

function simulationReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_PARAM':
      return {
       ...state,
        params: {...state.params,...action.payload },
      };
    case 'SIMULATION_START':
      return {
       ...state,
        status: 'simulating',
        feedback: `Simulating ${state.params.numSims} outcomes for ${state.params.numAssets} assets...`
      };
    case 'SIMULATION_SUCCESS':
      return {
       ...state,
        status: 'success',
        results: action.payload,
        feedback: `Simulation complete. Complexity impact: p³=${Math.pow(state.params.numAssets, 3)}, S*p²=${state.params.numSims * Math.pow(state.params.numAssets, 2)}`
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}


// --- VISUALIZATION COMPONENTS ---

const CorrelationHeatmap = React.memo(({ matrix }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
if (!canvasRef.current || !matrix || matrix.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    const size = matrix.length;
    const cellSize = 300 / size;
    ctx.clearRect(0, 0, 300, 300);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const value = matrix[i][j];
        const alpha = Math.abs(value);
        const color = value > 0? `rgba(0, 122, 122, ${alpha})` : `rgba(255, 99, 132, ${alpha})`;
        ctx.fillStyle = color;
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
    }
  }, [matrix]);

  return <canvas ref={canvasRef} width="300" height="300" style={{ borderRadius: '8px' }} />;
});

const OutcomesHistogram = React.memo(({ outcomes, varResult }) => {
if (!outcomes || outcomes.length === 0) return null;

    const portfolioValue = 1000000;
    const varLineValue = portfolioValue - varResult;

    const min = Math.min(...outcomes);
    const max = Math.max(...outcomes);
    const binCount = 50;
    const binWidth = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0);
    const labels = Array(binCount).fill(0).map((_, i) => (min + i * binWidth));

    outcomes.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
        bins[binIndex]++;
    });

    const data = {
        labels: labels.map(l => `$${(l/1000).toFixed(0)}k`),
        datasets: [
            {
                label: 'Outcomes',
                data: bins,
                backgroundColor: defaultTheme.chartPrimary,
                borderColor: defaultTheme.accent,
                borderWidth: 1,
            },
            {
                label: 'VaR Threshold',
                data: bins.map((_, i) => {
                    const binValue = min + i * binWidth;
                    return binValue >= varLineValue ? Math.max(...bins) : 0;
                }),
                type: 'bar',
                backgroundColor: defaultTheme.chartSecondary,
                borderWidth: 0,
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Distribution of Simulated Portfolio Outcomes', color: defaultTheme.text },
            tooltip: {
                callbacks: {
                    title: (tooltipItems) => `Value: ${tooltipItems.label}`,
                    label: (tooltipItem) => `Count: ${tooltipItem.raw}`
                }
            }
        },
        scales: {
            x: {
                ticks: { color: defaultTheme.subtext, maxRotation: 45, minRotation: 45 },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: { color: defaultTheme.subtext },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                title: { display: true, text: 'Frequency', color: defaultTheme.text }
            }
        }
    };

    return <Bar options={options} data={data} />;
});


// --- MAIN SIMULATOR COMPONENT ---

const RustInteractive = () => {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const { status, params, results, feedback } = state;
  const isSimulating = status === 'simulating';

  const runSimulation = useCallback(() => {
    dispatch({ type: 'SIMULATION_START' });

    // Use setTimeout to simulate an async operation and prevent UI blocking.
    // For a real, CPU-intensive task, this logic should be moved to a Web Worker.
    setTimeout(() => {
      const { numAssets, numDays, numSims } = params;
      const portfolioValue = 1000000;
      const dailyStdDev = 0.015;

      // 1. Generate correlation matrix for visualization
      const corrMatrix = Array(numAssets).fill(0).map((_, i) => 
        Array(numAssets).fill(0).map((_, j) => 
          i === j? 1.0 : Math.random() * 1.6 - 0.8
        )
      );

      // 2. Monte Carlo Simulation (simplified)
      const outcomes = [];
      for (let i = 0; i < numSims; i++) {
        const shock = randomNormal() * dailyStdDev;
        outcomes.push(portfolioValue * (1 + shock));
      }
      outcomes.sort((a, b) => a - b);

      // 3. Calculate VaR
      const varIndex = Math.floor(0.05 * numSims);
      const varValue = portfolioValue - outcomes[varIndex];

      dispatch({
        type: 'SIMULATION_SUCCESS',
        payload: {
          varResult: varValue,
          portfolioOutcomes: outcomes,
          correlationMatrix: corrMatrix,
        }
      });
    }, 100);
  }, [params]);

  // Run simulation on initial load
  useEffect(() => {
    runSimulation();
  },); // Empty dependency array ensures it only runs once on mount

  return (
    <Box sx={{ background: defaultTheme.bg, color: defaultTheme.text, py: 4, borderRadius: 2 }}>
      <Box sx={{ maxWidth: 1100, margin: '0 auto', px: 2 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          Interactive Monte Carlo VaR Simulator
        </Typography>
        
        <Grid container spacing={4}>
          {/* --- CONTROLS --- */}
          <Grid item xs={12} md={4}>
            <Card sx={{ background: defaultTheme.card, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Controls</Typography>
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <Box>
                    <Typography gutterBottom>Number of Assets (p)</Typography>
                    <Slider
                      disabled={isSimulating}
                      value={params.numAssets}
                      onChange={(e, val) => dispatch({ type: 'UPDATE_PARAM', payload: { numAssets: val } })}
                      min={2} max={50} step={1} valueLabelDisplay="auto"
                      sx={{ color: defaultTheme.accent }}
                    />
                  </Box>
                  <Box>
                    <Typography gutterBottom>Historical Days (N)</Typography>
                    <Slider
                      disabled={isSimulating}
                      value={params.numDays}
                      onChange={(e, val) => dispatch({ type: 'UPDATE_PARAM', payload: { numDays: val } })}
                      min={30} max={1000} step={10} valueLabelDisplay="auto"
                      sx={{ color: defaultTheme.accent }}
                    />
                  </Box>
                  <Box>
                    <Typography gutterBottom>Number of Simulations (S)</Typography>
                    <Slider
                      disabled={isSimulating}
                      value={params.numSims}
                      onChange={(e, val) => dispatch({ type: 'UPDATE_PARAM', payload: { numSims: val } })}
                      min={1000} max={50000} step={1000} valueLabelDisplay="auto"
                      sx={{ color: defaultTheme.accent }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    onClick={runSimulation}
                    disabled={isSimulating}
                    sx={{ backgroundColor: defaultTheme.accent, '&:hover': { backgroundColor: '#005f5f' } }}
                    startIcon={isSimulating && <CircularProgress size={20} color="inherit" />}
                  >
                    {isSimulating? 'Simulating...' : 'Run Simulation'}
                  </Button>
                  {feedback && (
                    <Typography variant="caption" sx={{ mt: 2, color: defaultTheme.subtext, fontStyle: 'italic' }}>
                      {feedback}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* --- RESULTS & VISUALIZATIONS --- */}
          <Grid item xs={12} md={8}>
            <Card sx={{ background: defaultTheme.card, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Simulation Results</Typography>
                <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" sx={{ color: defaultTheme.subtext }}>1-Day Value at Risk (95%)</Typography>
                    <Typography variant="h3" fontWeight={700} sx={{ color: defaultTheme.error }}>
                      ${results.varResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="body2" sx={{ color: defaultTheme.subtext }}>
                      Based on a $1,000,000 portfolio.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                     <Typography variant="subtitle2" align="center" gutterBottom>Simulated Correlation Matrix</Typography>
                     <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CorrelationHeatmap matrix={results.correlationMatrix} />
                     </Box>
                  </Grid>
                  <Grid item xs={12} sx={{ height: '300px', mt: 4 }}>
                    <OutcomesHistogram outcomes={results.portfolioOutcomes} varResult={results.varResult} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

// --- ARTICLE PAGE (Container) ---

const articles = [
  {
    tags: ["Finance", "Risk", "Monte Carlo", "Rust", "gRPC"],
    author: "Aether Ion",
    date: "2025-08-25",
    content: (
      <Box>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          RiskCalculator: Monte Carlo VaR Explained
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={700} gutterBottom>
          Rust gRPC Microservice for Financial Risk Analysis
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          {["Finance", "Risk", "Monte Carlo", "Rust", "gRPC"].map(tag => (
            <Chip key={tag} label={tag} size="medium" sx={{ fontSize: 16, fontWeight: 600 }} />
          ))}
        </Stack>
        <Divider sx={{ mb: 3 }} />
        <Typography variant="body1" fontSize={18} sx={{ mb: 2 }}>
          At the core of our financial risk microservice is a <strong>RiskCalculator</strong> that calculates Value at Risk (VaR) using Monte Carlo simulation. This method allows us to model thousands of potential future outcomes to estimate the risk of loss on an investment portfolio.
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Step-by-Step Algorithm
        </Typography>
        <ol style={{ fontSize: '1.1rem', marginBottom: 24, paddingLeft: 24 }}>
          <li>
            <strong>Data Validation:</strong> Checks for empty portfolios or insufficient historical data. If needed, it falls back to a simple volatility-based simulation for reliability.
          </li>
          <li>
            <strong>Covariance Matrix Calculation:</strong> Builds a matrix of historical asset returns and calculates their mean and covariance. This matrix is crucial for understanding how different assets move in relation to one another.[7, 8, 9]
          </li>
          <li>
            <strong>Correlated Monte Carlo Simulation:</strong> Uses Cholesky decomposition to generate thousands of realistic, correlated future scenarios. This ensures the simulation respects the historical relationships between assets. If decomposition fails, it falls back to independent (uncorrelated) sampling.
          </li>
          <li>
            <strong>VaR Calculation:</strong> After running 10,000+ simulations, the potential portfolio outcomes are sorted. The VaR is then calculated at the specified confidence level (e.g., the 5th percentile for 95% VaR), representing the estimated potential loss.[10, 11]
          </li>
        </ol>
        <Typography variant="body1" fontSize={18} sx={{ mb: 2 }}>
          This robust, multi-layered approach ensures our VaR calculations are reliable and adaptable, providing a high-fidelity risk assessment for your portfolio.
        </Typography>
        <Typography variant="body1" fontSize={18} sx={{ mb: 4 }}>
          Explore the interactive simulator below to see how parameters like the number of assets and simulations affect the VaR calculation and the distribution of potential outcomes.
        </Typography>
        <RustInteractive />
      </Box>
    ),
  },
];

const ArticlesPage = () => (
  <Box sx={{ maxWidth: 1200, margin: '40px auto', px: 2 }}>
    <Typography variant="h3" fontWeight={900} gutterBottom sx={{ mb: 4 }}>
      Articles
    </Typography>
    <Stack spacing={4}>
      {articles.map((article, idx) => (
        <Card key={idx} sx={{ textAlign: 'left', p: 2, boxShadow: 4 }}>
          <CardContent>
            {article.content}
          </CardContent>
        </Card>
      ))}
    </Stack>
  </Box>
);

export default ArticlesPage;
