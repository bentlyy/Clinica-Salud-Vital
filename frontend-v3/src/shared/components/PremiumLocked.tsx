import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';

export function PremiumLocked({ featureName }: { featureName?: string }) {
  const navigate = useNavigate();
  const theme = useTheme();

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
          backgroundColor: theme.palette.warning.light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LockIcon sx={{ fontSize: 32, color: theme.palette.warning.dark }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
        {featureName || 'Funcionalidad premium'}
      </Typography>
      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, maxWidth: 400 }}>
        Esta funcionalidad no está disponible en tu plan actual. Actualiza tu plan para desbloquearla.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/saas')}
        sx={{
          mt: 1,
          backgroundColor: theme.palette.primary.main,
          '&:hover': { backgroundColor: theme.palette.primary.dark },
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
