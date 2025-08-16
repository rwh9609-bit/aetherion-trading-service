import React from 'react';
import { Container, Typography, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';

const updates = [
  {
    date: '2024-06-15',
    title: 'Major Security Hardening',
    details: [
      'Envoy now terminates TLS for gRPC-Web on port 8080.',
      'Strict CORS and security headers (HSTS, CSP, X-Frame-Options) enforced.',
      'Health endpoints and structured logging added.',
      'See docs/SECURITY.md for details.'
    ]
  },
  {
    date: '2024-06-10',
    title: 'Deployment & Troubleshooting Improvements',
    details: [
      'Updated deployment flow: git fetch/pull, docker build/up, cert management.',
      'Quick rebuild instructions for single services.',
      'Expanded troubleshooting section in docs.'
    ]
  },
  {
    date: '2024-06-01',
    title: 'Stack & Architecture Updates',
    details: [
      'Polyglot microservices: Go (trading/bots), Rust (risk), Python (orchestrator), React (frontend).',
      'gRPC-Web via Envoy proxy; production-ready TLS and CORS.',
      'Bot and strategy orchestration improved.'
    ]
  }
];

const UpdatePage = () => (
  <Container maxWidth="md" sx={{ mt:4, mb:8 }}>
    <Card variant="outlined" sx={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
      <CardContent>
        <Typography variant="h4" fontWeight={700} gutterBottom>Latest Updates & Changelog</Typography>
        <List>
          {updates.map((update, idx) => (
            <ListItem key={idx} alignItems="flex-start" sx={{ mb:2 }}>
              <ListItemText
                primary={<Typography variant="h6">{update.date}: {update.title}</Typography>}
                secondary={
                  <ul style={{ margin:0, paddingLeft:20 }}>
                    {update.details.map((d, i) => <li key={i}><Typography variant="body2">{d}</Typography></li>)}
                  </ul>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  </Container>
);

export default UpdatePage;
