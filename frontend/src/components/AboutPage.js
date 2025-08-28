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
                            Our Story
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: { xs: 4, md: 6 }, textAlign: 'center' }}>
                            From a weekend curiosity to a community-driven platform.
                        </Typography>

                        <Grid container spacing={6} sx={{ mt: 4 }}>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    The Spark
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    Hey there, I'm the creator of Aetherion. By day, I'm a software engineer working on large-scale systems, but my fascination with financial markets and algorithmic trading has been a long-burning fire. It all started as a curiosity, devouring books and blog posts, until I reached a point where I wasn't content just reading—I needed to build. Aetherion is the product of that desire, born out of late nights and long weekends, fueled by coffee and the thrill of watching a complex system come to life.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    Finding the Gap
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    As I ventured deeper, I found myself in a frustrating search for the right tools. On one end, there were institutional-grade platforms with staggering complexity and price tags to match. On the other, simpler tools that couldn't handle the nuanced strategies I wanted to experiment with. There was no 'just right' for a developer like me. I envisioned a platform that was robust enough for serious backtesting but remained accessible and intuitive for an individual. Since I couldn't find it, I decided to build it myself.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    More Than Just Code
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    Honestly, building this in a vacuum is only half the fun. The real vision for Aetherion is to cultivate a vibrant community of traders, developers, and enthusiasts who share a passion for this space. I'm not a faceless corporation; I'm one person who genuinely wants to hear about your ideas, the strategies you're developing, and yes, even the bugs you find. This platform is a foundation, but the community is the structure we can build upon it, together.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
                                    The Path Forward (and a Note on Pricing)
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                    Let's talk about the elephant in the room: the subscription. To keep the servers running and justify the time away from my day job, I've introduced a monthly fee for advanced features. But I'll be the first to admit, I'm wrestling with it. Is $50 the right price? Does it create a barrier to the very community I hope to build? My goal is to find a sustainable path that doesn't compromise accessibility. Your feedback on this is not just welcome; it's essential. Let's shape the future of Aetherion together.
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