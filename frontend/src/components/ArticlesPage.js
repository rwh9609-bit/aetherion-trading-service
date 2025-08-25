import React from 'react';
import { Card, CardContent, Typography, Divider, Stack, Chip } from '@mui/material';

const articles = [
  {
    title: "How Our Service Calculates VaR Using Monte Carlo Simulations",
    subtitle: "Rust gRPC Microservice for Financial Risk Analysis",
    tags: ["Rust", "Finance", "gRPC", "Monte Carlo", "VaR"],
    content: (
      <>
        <Typography variant="body1" paragraph>
          At the core of our financial risk microservice is a <strong>RiskCalculator</strong> calculating Value at Risk (VaR) using a Monte Carlo simulation.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Under the Hood: Key Components</strong>
          <ul>
            <li>Historical Data Store</li>
            <li>Random Number Generator</li>
            <li>Value at Risk Calculation</li>
          </ul>
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>A Step-by-Step Look at the Algorithm</strong>
          <ol> 
            <li>
              <strong>Data Validation</strong>:The service first checks for common pitfalls. If you have an empty portfolio or insufficient historical data, it won't crash. Instead, it gracefully falls back to a simpler, volatility-based simulation. This guarantees you always get a result, even if it's a less precise one.
           </li>
            <li>
              <strong>Covariance Matrix Calculation:</strong>The code builds a matrix of asset returns and then meticulously calculates the mean and covariance matrix. This is crucial because it allows us to understand how different assets are correlated and how they influence each other's risk.
            </li>
            <li>
              <strong>Correlated Monte Carlo Simulation:</strong>This is the most complex part. We use a mathematical technique called Cholesky decomposition to generate thousands of simulated outcomes. This method creates realistic, correlated random shocks that reflect how assets behave in the real world. If this decomposition fails (often due to bad data), the system automatically falls back to a simpler, independent sampling model.
            </li>
            <li>
              <strong>VaR Calculation:</strong>After running 10,000 simulations, the code sorts the results from worst-case to best-case. The Value at Risk (VaR) is then calculated by identifying the value at the specified confidence level (e.g., the 5th percentile for a 95% VaR). This gives you a clear, quantitative measure of potential loss.
            </li>
          </ol>
        </Typography>
        <Typography variant="body2" paragraph>
          This robust, multi-layered approach ensures our VaR calculations are both reliable and adaptable, providing you with a high-fidelity risk assessment.
        </Typography>
      </>
    ),
  },
  // Add more articles here as needed
];

const ArticlesPage = () => (
  <Stack spacing={3} sx={{ maxWidth: 700, margin: '32px auto' }}>
    <Typography variant="h4" gutterBottom>
      Articles
    </Typography>
    {articles.map((article, idx) => (
      <Card key={idx}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {article.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {article.subtitle}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {article.tags.map(tag => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {article.content}
        </CardContent>
      </Card>
    ))}
  </Stack>
);

export default ArticlesPage;