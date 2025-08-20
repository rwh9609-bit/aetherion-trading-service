import React, { useState } from 'react';
import { Container, Typography, Card, CardContent, TextField, Button, Stack, Alert } from '@mui/material';

const ContactPage = () => {
  const [form, setForm] = useState({ name:'', email:'', message:'' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.message) {
      setError('All fields required.');
      return;
    }
    // Placeholder: Would POST to backend / ticket system.
    setTimeout(()=> setSubmitted(true), 300);
  };

  return (
    <Container maxWidth="sm" sx={{ mt:4, mb:8 }}>
      <Card variant="outlined" sx={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>Contact</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Send feedback, feature ideas, or integration questions. This demo form stores nothing—replace with your support integration.
          </Typography>
          {submitted ? (
            <Alert severity="success">Message received (demo). Thank you!</Alert>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                {error && <Alert severity="error" onClose={()=>setError(null)}>{error}</Alert>}
                <TextField label="Name" value={form.name} onChange={handleChange('name')} fullWidth required />
                <TextField label="Email" type="email" value={form.email} onChange={handleChange('email')} fullWidth required />
                <TextField label="Message" value={form.message} onChange={handleChange('message')} multiline minRows={4} fullWidth required />
                <Button type="submit" variant="contained">Send</Button>
              </Stack>
            </form>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ContactPage;
