import React from 'react';
import { Container, Typography, Card, CardContent, List, ListItem, ListItemText, Stack, Chip, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const newsItems = [
  {
    id: 1,
    date: '2025-08-19',
    title: 'Aetherion Launches New Website and Rebranding',
    category: 'Announcement',
    summary: 'We are thrilled to unveil our new brand identity and website, designed to better reflect our mission to democratize algorithmic trading.',
  },
  {
    id: 2,
    date: '2025-08-15',
    title: 'New Feature: Advanced Real-Time Charting',
    category: 'Product',
    summary: 'Our new advanced charting tools are now live, providing you with more power to analyze market data and strategy performance.',
  },
  {
    id: 3,
    date: '2025-08-10',
    title: 'Aetherion is Now Fully Open Source!',
    category: 'Community',
    summary: 'We have officially open-sourced the entire Aetherion platform. We invite developers from around the world to contribute.',
  },
  {
    id: 4,
    date: '2025-08-05',
    title: 'Join Our New Discord Community',
    category: 'Community',
    summary: 'Connect with other traders, share strategies, and get support from the Aetherion team in our new Discord channel.',
  },
];

const NewsCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius * 2,
  marginBottom: theme.spacing(3),
}));

const NewsPage = () => {
  const getChipColor = (category) => {
    switch (category) {
      case 'Announcement':
        return 'primary';
      case 'Product':
        return 'success';
      case 'Community':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ backgroundColor: '#10101a', color: '#fff', py: 8 }}>
      <Container maxWidth="md">
        <Typography variant="h3" component="h1" fontWeight={900} gutterBottom textAlign="center">
          News & Announcements
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          Stay up-to-date with the latest news, product updates, and community highlights from Aetherion.
        </Typography>

        <List>
          {newsItems.map((item) => (
            <ListItem key={item.id} sx={{ px: 0 }}>
              <NewsCard sx={{ width: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.date}
                    </Typography>
                    <Chip label={item.category} color={getChipColor(item.category)} size="small" />
                  </Stack>
                  <Typography variant="h6" component="h3" fontWeight={700} gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.summary}
                  </Typography>
                </CardContent>
              </NewsCard>
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
};

export default NewsPage;