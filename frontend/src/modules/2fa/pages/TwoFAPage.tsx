import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, CircularProgress, Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/Shield';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRedirectPath } from '@/shared/utils/role.utils';

/**
 * El segundo factor lo gestiona el Core durante su login (SSO). Esta ruta se
 * conserva solo como puente: si ya hay sesión entra al panel, si no, manda al
 * login central.
 */
export default function TwoFAPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      navigate(getRedirectPath(user.role), { replace: true });
      return;
    }
    login();
  }, [isLoading, isAuthenticated, user, login, navigate]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: 2 }}>
        <ShieldIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Verificación en Dos Pasos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          La verificación la gestiona tu cuenta central AMG.
        </Typography>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          <Link component="button" type="button" onClick={login} underline="hover">
            Reintentar
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
