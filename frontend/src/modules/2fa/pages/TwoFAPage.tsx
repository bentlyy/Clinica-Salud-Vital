import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import ShieldIcon from '@mui/icons-material/Shield';
import { useAuth } from '@/shared/providers/AuthProvider';

export default function TwoFAPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await login('', '', code);
      navigate('/dashboard');
    } catch {
      setError(t('two_fa:invalid_code', 'Código inválido. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: 2 }}>
        <ShieldIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight="bold">
          {t('two_fa:title', 'Verificación en Dos Pasos')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('two_fa:description', 'Ingresa el código de 6 dígitos de tu aplicación de autenticación.')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
            placeholder="000000"
            slotProps={{ htmlInput: { maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontFamily: 'monospace' } } }}
            sx={{ mb: 3 }}
            autoFocus
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading || code.length !== 6}>
            {loading ? <CircularProgress size={24} color="inherit" /> : t('two_fa:verify', 'Verificar')}
          </Button>
        </form>
        <Button fullWidth sx={{ mt: 2 }} onClick={() => navigate('/')}>
          {t('two_fa:back', 'Volver')}
        </Button>
      </Paper>
    </Box>
  );
}
