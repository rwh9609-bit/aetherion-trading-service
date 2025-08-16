import React, { useEffect, useState } from 'react';
import { Container, Typography, Card, CardContent, List, ListItem, ListItemText, Stack, Chip, Box, LinearProgress } from '@mui/material';

// Simple local mock feed; in production wire to a backend aggregator or RSS ingestor.
const mockNews = [
  { id:1, ts: Date.now() - 1000*60*5,  title:'New Bot Service Persistence Layer Added', tag:'Update' },
  { id:2, ts: Date.now() - 1000*60*35, title:'Momentum Scanner Gains Server Aggregation Endpoint', tag:'Feature' },
  { id:3, ts: Date.now() - 1000*60*55, title:'Auth Secret Rotation Support Implemented', tag:'Security' },
  { id:4, ts: Date.now(), title:'Production HTTPS & Security Upgrade Complete', tag:'Security' },
];

const timeAgo = (t) => {
  const diffM = Math.floor((Date.now() - t) / 60000);
  if (diffM < 1) return 'just now';
  if (diffM < 60) return diffM + 'm ago';
  const h = Math.floor(diffM/60);
  const m = diffM % 60;
  return `${h}h${m? ' '+m+'m':''} ago`;
};

const NewsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=> {
    // Simulate async fetch
    const id = setTimeout(()=> { setItems(mockNews); setLoading(false); }, 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt:4, mb:8 }}>
      <Card variant="outlined" sx={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>Project News</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Release notes & milestone highlights. Replace this with a backend news feed or CMS integration.
          </Typography>
          {loading && <LinearProgress sx={{ mb:2 }} />}
          <List dense>
            {items.map(n => (
              <ListItem key={n.id} alignItems="flex-start" sx={{ px:0 }}>
                <ListItemText 
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={600}>{n.title}</Typography>
                      <Chip size="small" label={n.tag} color={n.tag==='Security'? 'warning': n.tag==='Feature' ? 'success' : 'info'} />
                    </Stack>
                  }
                  secondary={
                    <Box sx={{ mt:0.5 }}>
                      <Typography variant="caption" color="text.secondary">{timeAgo(n.ts)}</Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {!loading && !items.length && (
              <ListItem sx={{ px:0 }}><ListItemText primary={<Typography variant="body2" color="text.secondary">No news yet.</Typography>} /></ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
};

export default NewsPage;
