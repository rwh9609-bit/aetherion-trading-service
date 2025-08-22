import { Container, Typography, Box, Card, CardContent, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

// Custom styled component for the Card to give it a more integrated, polished look.
const StyledCard = styled(Card)(({ theme }) => ({
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: theme.spacing(2),
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    padding: theme.spacing(4),
    backdropFilter: 'blur(10px)',
}));

const AboutPage = () => {
    return (
        <Box sx={{ backgroundColor: '#10101a', color: '#fff', py: { xs: 8, md: 12 } }}>
            <Container maxWidth="lg">
                <StyledCard>

                    <CardContent>
                        <Typography variant="h3" component="h1" fontWeight={900} gutterBottom sx={{ textAlign: 'center' }}>
                            About Aetherion
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: { xs: 4, md: 6 }, textAlign: 'center' }}>
                            The definitive platform for institutional-grade algorithmic trading.
                        </Typography>

                        <Grid container spacing={6} sx={{ mt: 4 }}>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    Performance-Driven Architecture
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    Aetherion is engineered from the ground up to meet the rigorous demands of professional trading. Our **polyglot microservices** architecture strategically employs specialized languages—Go for concurrent execution, Rust for memory-safe and high-speed risk calculations, and Python for agile strategy development—to deliver superior latency and unparalleled reliability.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    Our Commitment to the Quant Community
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    Our mission is to empower quantitative developers and financial firms with a robust, customizable, and high-performance trading infrastructure. We provide the tools necessary to deploy sophisticated, proprietary strategies with confidence, ensuring absolute speed, security, and control over your operations.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    Aetherion's Core Technologies
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    Our foundation is built upon a robust set of technologies, ensuring peak performance and stability for your critical trading operations.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    Designed for Institutional Scale
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    From integrated risk management to seamless cloud deployment, our platform is built for scalability and security. We abstract away infrastructure complexities, allowing your team to focus exclusively on what drives alpha: strategy development.
                                </Typography>
                            </Grid>

                        </Grid>

                    </CardContent>
                </StyledCard>
            </Container>
        </Box>
    );
};

export default AboutPage;