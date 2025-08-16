import React from 'react';
import { Container, Typography, Box, Card, CardContent, Stack } from '@mui/material';

const AboutPage = () => {
  return (
    <Container maxWidth="md" sx={{ mt:4, mb:8 }}>
      <Card variant="outlined" sx={{ background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' }}>
        <CardContent>
          <Typography variant="h4" fontWeight={700} gutterBottom>About Aetherion</Typography>
          <Typography variant="h6" color="primary" sx={{ mt:2 }} gutterBottom>
             Open Source & Developer Community
          </Typography>
          <Typography variant="body1" paragraph>
            Aetherion is fully open source and actively seeking contributors! If youre a developer, quant, or fintech enthusiast, check out our new Careers page or see DEVELOPER.md for details.
          </Typography>
          <Typography variant="body1" paragraph>
            Aetherion is a polyglot quantitative trading experimentation platform combining Go, Rust, Python, and
            a modern React + gRPC-Web frontend. It is designed for rapid strategy prototyping, cross‑language
            performance comparisons, and educational transparency.
          </Typography>
          <Typography variant="h6" sx={{ mt:3 }} gutterBottom>Core Pillars</Typography>
          <Stack spacing={1} sx={{ pl:1 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>Performance Conscious</Typography>
              <Typography variant="body2" color="text.secondary">Rust & Go services focus on deterministic low‑latency execution paths.</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>Extensibility</Typography>
              <Typography variant="body2" color="text.secondary">Well‑defined protobuf contracts enable seamless multi‑language client generation.</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>Observability First</Typography>
              <Typography variant="body2" color="text.secondary">Planned metrics, structured logging, and health endpoints guide iterative tuning.</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" sx={{ mt:4 }} color="text.secondary">
            Roadmap previews: richer risk engines, strategy backtesting, persistent PnL tracking, live exchange connectivity, and
            WebAssembly sandboxed custom strategies.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AboutPage;
