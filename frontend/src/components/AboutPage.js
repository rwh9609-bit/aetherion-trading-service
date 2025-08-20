import React from 'react';
import { Container, Typography, Box, Card, CardContent, Avatar, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(4),
  textAlign: 'center',
  color: '#fff',
}));

const AboutPage = () => {
  return (
    <Box sx={{ backgroundColor: '#10101a', color: '#fff', py: 8 }}>
      <Container maxWidth="md">
        <StyledCard>
          <Typography variant="h3" component="h1" fontWeight={900} gutterBottom>
            About Aetherion
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            The engine for serious quants.
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12}>
              <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                Engineered for Performance
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Unlike retail-focused platforms, Aetherion is not a simplified tool. It is a professional-grade engine built to handle the most demanding trading strategies. Our **polyglot architecture** leverages the strengths of multiple languages to achieve microsecond-level latency and enterprise-grade reliability.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                Our Core Mission
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Our mission is to empower developers, quantitative analysts, and financial institutions with a customizable, low-latency trading infrastructure. We believe in providing the tools for you to deploy your own proprietary strategies with unparalleled speed, security, and control.
              </Typography>
            </Grid>
          </Grid>
        </StyledCard>
      </Container>
    </Box>
  );
};

export default AboutPage;