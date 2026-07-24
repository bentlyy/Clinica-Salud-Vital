import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Email from '@mui/icons-material/Email';
import Lock from '@mui/icons-material/Lock';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/shared/providers/AuthProvider';

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;

function createLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t('login.email_invalid')),
    password: z.string().min(6, t('login.password_min_length')),
  });
}

export default function LoginPage() {
  const theme = useTheme();
  const { t } = useTranslation('login');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await login(data.email, data.password);
      if (response.requires_2fa) {
        navigate('/2fa');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setError(apiErr.response?.data?.error || t('login.login_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.custom.surface.muted,
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 4,
          borderRadius: '16px',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.background.paper,
              fontWeight: 700,
              fontSize: '1.25rem',
              mx: 'auto',
              mb: 2,
            }}
          >
            C
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('login.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            {t('login.subtitle')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('email')}
            fullWidth
            label={t('login.email_label')}
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            {...register('password')}
            fullWidth
            label={t('login.password_label')}
            type={showPassword ? 'text' : 'password'}
            error={!!errors.password}
            helperText={errors.password?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{
              py: 1.5,
              fontSize: '0.9375rem',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : t('login.login_button')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
