import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, CardContent, Avatar, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ArrowForward, Language, Hub, Security } from '@mui/icons-material';

// Custom styled components (unchanged)
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
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: theme.shape.borderRadius * 2,
  height: '100%',
  minHeight: 260,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-7px) scale(1.03)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
  },
}));

const Section = styled(Box)(({ theme }) => ({
  padding: theme.spacing(10, 2),
}));

const LanguageChips = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  marginBottom: theme.spacing(3),
}));

const LandingPage = ({ onGetStarted }) => {
  const languages = [
    { label: 'Rust', color: '#dea584' },
    { label: 'Go', color: '#00ADD8' },
    { label: 'Python', color: '#3776AB' },
    { label: 'C++', color: '#00599C' },
    { label: 'TypeScript', color: '#3178C6' },
    { label: 'Java', color: '#b07219' },
    { label: 'Kotlin', color: '#7F52FF' },
    { label: 'Node.js', color: '#68A063' },
  ];

  const features = [
    {
      icon: <Language fontSize="large" sx={{ color: '#6EE7B7' }} />,
      title: 'Performance Without Compromise',
      description: 'Leverage a polyglot architecture with services in Rust and C++ for critical performance, Go for concurrent operations, and Python for rapid strategy development.',
    },
    {
      icon: <Hub fontSize="large" sx={{ color: '#3B82F6' }} />,
      title: 'Institutional-Grade Infrastructure',
      description: 'Run your strategies on a battle-tested engine built for reliability and low-latency execution, ensuring your trades are handled with precision.',
    },
    {
      icon: <Security fontSize="large" sx={{ color: '#9333EA' }} />,
      title: 'Integrated Risk Management',
      description: 'Aetherion’s dedicated risk service provides real-time portfolio analysis and control, giving you confidence and capital protection at every step.',
    },
  ];

  return (
    <Box sx={{ backgroundColor: '#10101a', color: '#fff' }}>
      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" fontWeight={900} gutterBottom>
            The Algorithmic Trading Platform Built for Scale.
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Aetherion delivers the speed, security, and flexibility required by today's most demanding quantitative strategies.
          </Typography>
          <LanguageChips>
            {languages.map(lang => (
              <Chip
                key={lang.label}
                label={lang.label}
                sx={{
                  bgcolor: lang.color,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  px: 2,
                  py: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </LanguageChips>
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
              mt: 2,
            }}
          >
            Request a Demo
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
            © 2025 Aetherion. All Rights Reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;