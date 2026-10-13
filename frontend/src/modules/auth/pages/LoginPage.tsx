import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, CircularProgress, Link } from '@mui/material';
import LocalHospital from '@mui/icons-material/LocalHospital';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRedirectPath } from '@/shared/utils/role.utils';

/**
 * La autenticación la gestiona el Core (SSO). Esta página ya no pide
 * credenciales: redirige al login central y, si la sesión ya existe, entra
 * directo al panel correspondiente al rol.
 */
export default function LoginPage() {
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      navigate(getRedirectPath(user.role), { replace: true });
      return;
    }
    login();
  }, [isLoading, isAuthenticated, user, login, navigate]);

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="background.default"
      p={2}
    >
      <Card sx={{ width: 420, maxWidth: '90vw' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <LocalHospital sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Vitaria
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Plataforma de gestión para clínicas
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={3}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Redirigiendo al acceso central…
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={3}>
            El acceso lo gestiona tu cuenta AMG.{' '}
            <Link component="button" type="button" onClick={login} underline="hover">
              Reintentar
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
