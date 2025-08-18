import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import LivePriceChart from './LivePriceChart';

export default function LiveChartsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Live Price Charts</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          <LivePriceChart symbol={'ETHUSD'} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <LivePriceChart symbol={'BTCUSD'} />
        </Box>
      </Box>
    </Container>
  );
}
