import React, { useState } from 'react';
import { Container, Typography, Card, CardContent, TextField, Button, Stack, Alert } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';

const ContactPage = () => {
  return (
    <Container maxWidth="sm" sx={{ mt:4, mb:8 }}>
      <Card variant="outlined" sx={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>Contact</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Send feedback, feature ideas, or integration questions. This demo form stores nothing—replace with your support integration.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Join our Discord community for real-time discussions and support!
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ForumIcon />}
            href="https://discord.gg/Kjd3c6h3My"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 2 }}
          >
            Join our Discord
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ContactPage;
