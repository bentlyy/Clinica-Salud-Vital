import { Box, Typography, Paper } from '@mui/material';
import Construction from '@mui/icons-material/Construction';

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Box>
      <Paper
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: 2,
          border: '2px dashed #e5e7eb',
          backgroundColor: '#ffffff',
        }}
      >
        <Construction sx={{ fontSize: 48, color: '#d1d5db' }} />
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#374151' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Este módulo será implementado próximamente.
        </Typography>
      </Paper>
    </Box>
  );
}
