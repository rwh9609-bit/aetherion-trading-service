import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Custom styled components
const GradientText = styled(Typography)(({ theme }) => ({
  background: 'linear-gradient(to right, #6EE7B7, #3B82F6, #9333EA)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 900,
}));

const GlowCard = styled(Card)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 0 15px rgba(110, 231, 183, 0.1), 0 0 30px rgba(59, 130, 246, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 0 20px rgba(110, 231, 183, 0.2), 0 0 40px rgba(59, 130, 246, 0.2)',
    transform: 'translateY(-2px)',
  },
}));

const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, #1a1a2e 100%)`,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
}));

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      title: 'Advanced Risk Management',
      color: '#6EE7B7',
      description: 'Built with Rust for safety-critical calculations, our risk service provides real-time VaR analysis, position monitoring, and automated risk controls with microsecond precision.',
      items: [
        'Real-time Value at Risk (VaR)',
        'Position-level risk limits',
        'Portfolio exposure controls',
        'Configurable risk parameters'
      ]
    },
    {
      title: 'Reliable Market Data',
      color: '#3B82F6',
      description: 'Our Go-powered market data service provides redundant data feeds with automatic failover between Coinbase and Binance, ensuring uninterrupted trading operations.',
      items: [
        'Multi-exchange support',
        'Automatic failover',
        'Real-time price feeds',
        'HTTP monitoring endpoints'
      ]
    },
    {
      title: 'Smart Trading Strategies',
      color: '#9333EA',
      description: 'Implement sophisticated trading strategies in Python with our flexible strategy framework, including built-in mean reversion with dynamic position sizing.',
      items: [
        'Z-score based signals',
        'Dynamic position sizing',
        'Automated stop losses',
        'Risk-adjusted sizing'
      ]
    }
  ];

  const architectureServices = [
    {
      title: 'Rust Risk Service (Port 50052)',
      color: '#6EE7B7',
      description: 'High-performance risk calculations and position monitoring',
      features: ['Real-time VaR calculations', 'Position risk assessment', 'Pre-trade risk checks']
    },
    {
      title: 'Go Trading Service (Port 50051)',
      color: '#3B82F6',
      description: 'Market data and trade execution gateway',
      features: ['Multi-exchange price feeds', 'Order execution', 'HTTP monitoring (Port 8080)']
    },
    {
      title: 'Python Orchestrator',
      color: '#9333EA',
      description: 'Strategy implementation and coordination',
      features: ['Mean reversion strategy', 'Position management', 'Risk limit enforcement']
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="lg">
          <Box textAlign="center" py={10}>
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '3rem', md: '4.5rem' }, 
                fontWeight: 900,
                mb: 2,
                lineHeight: 1.1
              }}
            >
              Modern{' '}
              <GradientText component="span" variant="h1" sx={{ fontSize: 'inherit' }}>
                Trading Architecture
              </GradientText>
            </Typography>
            
            <Typography 
              variant="h5" 
              color="text.secondary" 
              sx={{ maxWidth: '800px', mx: 'auto', mb: 4, lineHeight: 1.6 }}
            >
              Aetherion is a next-generation, cloud-native trading engine designed for ambitious quants and developers. 
              Create, deploy, and scale your strategies seamlessly with our powerful, polyglot architecture.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={onGetStarted}
                sx={{ 
                  fontSize: '1.1rem',
                  py: 1.5,
                  px: 4,
                  background: 'linear-gradient(45deg, #6EE7B7, #3B82F6)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5dd4a3, #2563eb)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Get Started
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                sx={{ 
                  fontSize: '1.1rem',
                  py: 1.5,
                  px: 4,
                  borderColor: '#3B82F6',
                  color: '#3B82F6',
                  '&:hover': {
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                  }
                }}
              >
                View Architecture
              </Button>
            </Box>
          </Box>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Box sx={{ py: 10, backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" textAlign="center" gutterBottom sx={{ mb: 6, fontWeight: 700 }}>
            Why Aetherion?
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <GlowCard sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography 
                      variant="h4" 
                      gutterBottom 
                      sx={{ color: feature.color, fontWeight: 700, mb: 2 }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      {feature.description}
                    </Typography>
                    <List dense sx={{ mt: 2 }}>
                      {feature.items.map((item, itemIndex) => (
                        <ListItem key={itemIndex} sx={{ py: 0.5, px: 0 }}>
                          <ListItemText 
                            primary={`• ${item}`}
                            primaryTypographyProps={{ 
                              variant: 'body2', 
                              color: 'text.secondary' 
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </GlowCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Architecture Section */}
      <Box sx={{ py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h2" textAlign="center" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
            A Polyglot Architecture That Performs
          </Typography>
          <Typography 
            variant="h6" 
            textAlign="center" 
            color="text.secondary" 
            sx={{ maxWidth: '600px', mx: 'auto', mb: 6 }}
          >
            We use the best tool for every job, giving you a stable and powerful foundation for your quantitative strategies.
          </Typography>
          
          <GlowCard sx={{ maxWidth: '900px', mx: 'auto' }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                {architectureServices.map((service, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Box 
                      sx={{ 
                        p: 3, 
                        borderRadius: 2, 
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        height: '100%'
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        gutterBottom 
                        sx={{ color: service.color, fontWeight: 700 }}
                      >
                        {service.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {service.description}
                      </Typography>
                      <List dense>
                        {service.features.map((feature, featureIndex) => (
                          <ListItem key={featureIndex} sx={{ py: 0.25, px: 0 }}>
                            <ListItemText 
                              primary={`• ${feature}`}
                              primaryTypographyProps={{ 
                                variant: 'caption', 
                                color: 'text.secondary' 
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              
              <Box 
                sx={{ 
                  mt: 4, 
                  p: 4, 
                  backgroundColor: 'rgba(0,0,0,0.3)', 
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Architecture: React Frontend ↔ Envoy Proxy ↔ gRPC Services (Go/Rust/Python)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Real-time data flow with WebSocket feeds, streaming gRPC, and event-driven architecture
                </Typography>
              </Box>
            </CardContent>
          </GlowCard>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" textAlign="center" color="text.secondary">
            © 2025 Aetherion. All rights reserved.
          </Typography>
          <Typography variant="caption" textAlign="center" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Built for the next generation of quantitative trading.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
