import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, CardContent, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ArrowForward, BarChart, Code, Security } from '@mui/icons-material';

// Custom styled components
const HeroSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  minHeight: '90vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: '#fff',
  padding: theme.spacing(8, 2),
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius * 2,
  height: '100%',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
  },
}));

const Section = styled(Box)(({ theme }) => ({
  padding: theme.spacing(10, 2),
}));

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: <BarChart fontSize="large" sx={{ color: '#6EE7B7' }} />,
      title: 'Real-Time Analytics',
      description: 'Monitor markets and strategy performance with live data streams and advanced charting tools.',
    },
    {
      icon: <Code fontSize="large" sx={{ color: '#3B82F6' }} />,
      title: 'Automated Strategies',
      description: 'Build, backtest, and deploy your own automated trading bots using our flexible and powerful framework.',
    },
    {
      icon: <Security fontSize="large" sx={{ color: '#9333EA' }} />,
      title: 'Institutional-Grade Security',
      description: 'Trade with confidence thanks to our robust, secure, and scalable cloud-native architecture.',
    },
  ];

  return (
    <Box sx={{ backgroundColor: '#10101a', color: '#fff' }}>
      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" fontWeight={900} gutterBottom>
            The Future of Algorithmic Trading is Here.
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Aetherion provides the tools, data, and infrastructure for you to build and deploy world-class trading strategies.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={onGetStarted}
            endIcon={<ArrowForward />}
            sx={{
              background: 'linear-gradient(45deg, #6EE7B7, #3B82F6)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5dd4a3, #2563eb)',
              },
              fontSize: '1.1rem',
              py: 1.5,
              px: 4,
            }}
          >
            Start Building
          </Button>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Section>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <FeatureCard>
                  <CardContent sx={{ textAlign: 'center', p: 4 }}>
                    <Avatar sx={{ bgcolor: 'transparent', margin: '0 auto 16px', width: 64, height: 64 }}>
                      {feature.icon}
                    </Avatar>
                    <Typography variant="h5" component="h3" fontWeight={700} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </FeatureCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* Footer */}
      <Box component="footer" sx={{ py: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" textAlign="center" color="text.secondary">
            © 2025 Aetherion. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;