import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export function PremiumLocked({ featureName }: { featureName?: string }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '16px',
          backgroundColor: '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LockIcon sx={{ fontSize: 32, color: '#d97706' }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
        {featureName || 'Funcionalidad premium'}
      </Typography>
      <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: 400 }}>
        Esta funcionalidad no está disponible en tu plan actual. Actualiza tu plan para desbloquearla.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/saas')}
        sx={{
          mt: 1,
          backgroundColor: '#0d9488',
          '&:hover': { backgroundColor: '#0f766e' },
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
        }}
      >
        Ver Planes
      </Button>
    </Box>
  );
}
