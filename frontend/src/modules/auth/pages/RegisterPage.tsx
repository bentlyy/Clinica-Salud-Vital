import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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
  Chip,
} from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Email from '@mui/icons-material/Email';
import Lock from '@mui/icons-material/Lock';
import Person from '@mui/icons-material/Person';
import Science from '@mui/icons-material/Science';
import LocalHospital from '@mui/icons-material/LocalHospital';
import PersonOutline from '@mui/icons-material/PersonOutline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/services/api-client';

interface InviteInfo {
  email: string;
  name: string;
  role: string;
  specialty: string | null;
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  doctor: { label: 'Médico', icon: <LocalHospital sx={{ fontSize: 18 }} /> },
  lab_technician: { label: 'Técnico de Laboratorio', icon: <Science sx={{ fontSize: 18 }} /> },
  patient: { label: 'Paciente', icon: <PersonOutline sx={{ fontSize: 18 }} /> },
};

function getRoleLabel(role: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    doctor: t('role_doctor'),
    lab_technician: t('role_lab_technician'),
    patient: t('role_patient'),
  };
  return map[role] || role;
}

export default function RegisterPage() {
  const theme = useTheme();
  const { t } = useTranslation('register');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const registerSchema = z.object({
    name: z.string().min(1, t('name_required')),
    password: z
      .string()
      .min(8, t('password_min_length'))
      .regex(/[A-Z]/, t('password_need_uppercase'))
      .regex(/[a-z]/, t('password_need_lowercase'))
      .regex(/[0-9]/, t('password_need_number'))
      .regex(/[^A-Za-z0-9]/, t('password_need_special')),
    confirmPassword: z.string().min(1, t('confirm_password_required')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('passwords_dont_match'),
    path: ['confirmPassword'],
  });

  type RegisterForm = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    values: { name: inviteInfo?.name || '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!inviteToken) {
      setInviteError(t('no_token'));
      setLoadingInvite(false);
      return;
    }
    setLoadingInvite(true);
    setInviteError(null);
    apiClient.get<InviteInfo>('/auth/invite-info', { params: { token: inviteToken } })
      .then(({ data }) => {
        setInviteInfo(data);
        setLoadingInvite(false);
      })
      .catch(() => {
        setInviteError(t('invalid_token'));
        setLoadingInvite(false);
      });
  }, [inviteToken, t]);

  const onSubmit = async (data: RegisterForm) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/register', {
        email: inviteInfo!.email,
        password: data.password,
        name: data.name,
        invite_token: inviteToken,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setSubmitError(apiErr.response?.data?.error || t('register_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!inviteToken) {
    return (
      <BaseLayout theme={theme}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>{t('no_invite')}</Alert>
      </BaseLayout>
    );
  }

  if (loadingInvite) {
    return (
      <BaseLayout theme={theme}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>{t('verifying')}</Typography>
        </Box>
      </BaseLayout>
    );
  }

  if (inviteError) {
    return (
      <BaseLayout theme={theme}>
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>{inviteError}</Alert>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/')}
          sx={{ py: 1.5, borderRadius: 2 }}
        >
          {t('back_home')}
        </Button>
      </BaseLayout>
    );
  }

  if (success) {
    return (
      <BaseLayout theme={theme}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              fontSize: 32,
              color: 'white',
            }}
          >
            ✓
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t('success_title')}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>{t('success_message')}</Typography>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => navigate('/')}
            sx={{
              py: 1.5,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            {t('go_login')}
          </Button>
        </Box>
      </BaseLayout>
    );
  }

  const roleData = roleConfig[inviteInfo!.role] || { label: inviteInfo!.role, icon: <PersonOutline /> };

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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('title')}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            {t('subtitle')}
          </Typography>
        </Box>

        {submitError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{submitError}</Alert>
        )}

        {/* Invite info card */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.custom.surface.muted,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {roleData.icon}
            <Chip
              label={getRoleLabel(inviteInfo!.role, t)}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
            {inviteInfo!.specialty && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {inviteInfo!.specialty}
              </Typography>
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {inviteInfo!.email}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('name')}
            fullWidth
            label={t('name_label')}
            error={!!errors.name}
            helperText={errors.name?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label={t('email_label')}
            value={inviteInfo!.email}
            disabled
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
            label={t('password_label')}
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
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            {...register('confirmPassword')}
            fullWidth
            label={t('confirm_password_label')}
            type={showConfirm ? 'text' : 'password'}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
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
                      onClick={() => setShowConfirm(!showConfirm)}
                      edge="end"
                      size="small"
                      aria-label={showConfirm ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                    >
                      {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 1 }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 3, px: 1 }}>
            {t('password_requirements')}
          </Typography>

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
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : t('register_button')}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('already_have_account')}{' '}
            <Link to="/" style={{ color: theme.palette.primary.main, fontWeight: 600, textDecoration: 'none' }}>
              {t('login_link')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

function BaseLayout({ theme, children }: { theme: Theme; children: React.ReactNode }) {
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
        {children}
      </Paper>
    </Box>
  );
}
