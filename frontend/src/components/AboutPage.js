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
            Empowering the next generation of quantitative finance.
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12}>
              <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Our mission is to democratize access to institutional-grade trading technology. We believe that by providing powerful, accessible, and transparent tools, we can empower individuals and small teams.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                Our Story
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Aetherion was born from the idea that cutting-edge trading technology should be accessible to everyone. Our founders, a group of passionate traders and engineers, came together to create a platform that breaks down the barriers to entry in the world of algorithmic trading.
              </Typography>
            </Grid>
          </Grid>
        </StyledCard>
      </Container>
    </Box>
  );
};

export default AboutPage;