import React from 'react';
import { Container, Typography, Card, CardContent, List, ListItem, ListItemText, Button } from '@mui/material';

const CareersPage = () => (
  <Container maxWidth="md" sx={{ mt:4, mb:8 }}>
    <Card variant="outlined" sx={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
      <CardContent>
        <Typography variant="h4" fontWeight={700} gutterBottom>Careers & Opportunities</Typography>
        <Typography variant="body1" paragraph>
          Aetherion is open source and always looking for passionate contributors, developers, quants, and fintech enthusiasts.
        </Typography>
        <Typography variant="h6" sx={{ mt:3 }} gutterBottom>How to Get Involved</Typography>
        <List>
          <ListItem><ListItemText primary="Fork and star the repo on GitHub" /></ListItem>
          <ListItem><ListItemText primary="Open issues and feature requests" /></ListItem>
          <ListItem><ListItemText primary="Submit pull requests" /></ListItem>
          <ListItem><ListItemText primary="Join our Discord/Matrix (coming soon)" /></ListItem>
        </List>
        <Typography variant="body2" sx={{ mt:4 }} color="text.secondary">
          We welcome remote contributors, interns, and anyone interested in building the future of trading technology. See DEVELOPER.md for technical details.
        </Typography>
        <Button variant="contained" color="primary" href="mailto:opensource@aetherion.cloud" sx={{ mt:3 }}>
          Contact Us
        </Button>
      </CardContent>
    </Card>
  </Container>
);

export default CareersPage;
