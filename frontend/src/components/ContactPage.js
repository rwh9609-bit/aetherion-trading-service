import React from 'react';
import { Container, Typography, Card, CardContent, Link } from '@mui/material';

const ContactPage = () => {
  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 8 }}>
      <Card variant="outlined" sx={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>Contact Us</Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            For any inquiries, feedback, or support questions, please feel free to reach out to us. We appreciate your interest in Aetherion and look forward to hearing from you.
          </Typography>
          <Typography variant="h6" sx={{ mt: 3 }}>
            Email
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You can contact us directly via email at: <Link href="mailto:randy@aetherion.cloud" color="primary">randy@aetherion.cloud</Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ContactPage;