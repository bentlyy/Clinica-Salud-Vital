import { Box, Typography, Button } from '@mui/material';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Refresh from '@mui/icons-material/Refresh';
import type { AxiosError } from 'axios';

interface ErrorStateProps {
  error?: AxiosError<{ error?: string }> | Error;
  onRetry?: () => void;
  variant?: 'default' | 'forbidden' | 'notFound';
}

export function ErrorState({ error, onRetry, variant = 'default' }: ErrorStateProps) {
  const config = {
    default: {
      icon: <ErrorOutline sx={{ fontSize: 48, color: '#ef4444' }} />,
      title: 'Algo salió mal',
      message: error?.message || 'Ocurrió un error inesperado. Intenta de nuevo.',
    },
    forbidden: {
      icon: <ErrorOutline sx={{ fontSize: 48, color: '#f59e0b' }} />,
      title: 'Acceso denegado',
      message: 'No tienes permisos para acceder a este recurso.',
    },
    notFound: {
      icon: <ErrorOutline sx={{ fontSize: 48, color: '#6b7280' }} />,
      title: 'No encontrado',
      message: 'El recurso que buscas no existe o fue eliminado.',
    },
  };

  const { icon, title, message } = config[variant];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        gap: 2,
        textAlign: 'center',
      }}
    >
      {icon}
      <Typography variant="h5" sx={{ fontWeight: 600, color: '#1f2937' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', maxWidth: 400 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          Reintentar
        </Button>
      )}
    </Box>
  );
}
