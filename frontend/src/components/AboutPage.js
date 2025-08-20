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
            Let's build the future of trading, together.
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12}>
              <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="body1" color="text.secondary">
                We want to make top-tier trading tech available to everyone. We believe that with the right tools, anyone can build powerful trading strategies.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                Our Story
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Aetherion started with a simple idea: trading technology should be for everyone. We're a team of traders and engineers who wanted to build a platform that makes it easier for anyone to get into algorithmic trading.
              </Typography>
            </Grid>
          </Grid>
        </StyledCard>
      </Container>
    </Box>
  );
};

export default AboutPage;
