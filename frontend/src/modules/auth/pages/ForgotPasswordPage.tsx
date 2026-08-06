import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import LockResetIcon from '@mui/icons-material/LockReset';
import { apiClient } from '@/shared/services/api-client';

export default function ForgotPasswordPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError(t('forgot_password:error', 'Error al enviar el correo. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
        <Paper elevation={3} sx={{ p: 4, maxWidth: 420, textAlign: 'center', borderRadius: 2 }}>
          <LockResetIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {t('forgot_password:sent_title', 'Correo enviado')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('forgot_password:sent_message', 'Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.')}
          </Typography>
          <Button component={Link} to="/" variant="contained" fullWidth>
            {t('forgot_password:back_login', 'Volver al inicio de sesión')}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 4, maxWidth: 420, borderRadius: 2 }}>
        <Box textAlign="center" sx={{ mb: 3 }}>
          <LockResetIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 1 }} />
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {t('forgot_password:title', '¿Olvidaste tu contraseña?')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('forgot_password:subtitle', 'Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecerla.')}
          </Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="email"
            label={t('forgot_password:email', 'Correo electrónico')}
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            required
            sx={{ mb: 3 }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}>
            {loading ? '...' : t('forgot_password:submit', 'Enviar instrucciones')}
          </Button>
        </form>
        <Button fullWidth sx={{ mt: 2 }} component={Link} to="/">
          {t('forgot_password:back', 'Volver')}
        </Button>
      </Paper>
    </Box>
  );
}
