import { useState, useEffect, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { apiClient } from '@/shared/services/api-client';

type PageStatus = 'loading' | 'success' | 'error' | 'info';

export default function ConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('confirm.error_desc', 'Token no válido.'));
      return;
    }
    apiClient.post(`/bookings/confirm/${token}`)
      .then((r: { data: { alreadyConfirmed?: boolean } }) => {
        if (r.data.alreadyConfirmed) {
          setStatus('info');
          setMessage(t('confirm.already', 'Esta cita ya había sido confirmada anteriormente.'));
          return;
        }
        setStatus('success');
        setMessage(t('confirm.success_desc', 'Tu cita ha sido confirmada exitosamente.'));
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('confirm.error_desc', 'No se pudo confirmar la cita. El enlace puede haber expirado.'));
      });
  }, [token, t]);

  const iconMap: Record<PageStatus, JSX.Element> = {
    loading: <CircularProgress size={64} sx={{ color: '#0d9488' }} />,
    success: <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e' }} />,
    error: <ErrorIcon sx={{ fontSize: 64, color: '#ef4444' }} />,
    info: <InfoIcon sx={{ fontSize: 64, color: '#f59e0b' }} />,
  };

  const titleMap: Record<PageStatus, string> = {
    loading: t('confirm.confirming', 'Confirmando tu cita...'),
    success: t('confirm.success_title', '¡Cita Confirmada!'),
    error: t('confirm.error_title', 'Error de Confirmación'),
    info: t('confirm.title', 'Información'),
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 5, maxWidth: 450, textAlign: 'center', borderRadius: 2 }}>
        <Box sx={{ mb: 2 }}>{iconMap[status]}</Box>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          {titleMap[status]}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        {status !== 'loading' && (
          <Button variant="contained" onClick={() => navigate('/')} fullWidth size="large">
            {t('confirm.back_home', 'Volver al inicio')}
          </Button>
        )}
      </Paper>
    </Box>
  );
}
