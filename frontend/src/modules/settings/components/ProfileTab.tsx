import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Avatar,
  Typography,
  Divider,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  Paper,
  Chip,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockReset from '@mui/icons-material/LockReset';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile, useChangePassword } from '../hooks/useSettings';
import { useAuth } from '@/shared/providers/AuthProvider';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { getRoleLabel, getRoleColor, normalizeRole } from '@/shared/utils/role.utils';
import type { JwtUser } from '@/shared/types/api.types';

function createPasswordSchema(t: (key: string) => string) {
  return z.object({
    current_password: z.string().min(1, t('current_password_required')),
    new_password: z.string().min(6, t('password_min_length_profile')),
  }).refine((data) => data.current_password !== data.new_password, {
    message: t('password_must_differ'),
    path: ['new_password'],
  });
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const theme = useTheme();
  return (
    <Box display="flex" alignItems="center" gap={2} py={1.5}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: theme.palette.custom.status.info.bg,
          color: theme.palette.custom.status.info.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box minWidth={0}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={500} noWrap>
          {value || '—'}
        </Typography>
      </Box>
    </Box>
  );
}

export function ProfileTab() {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const { data: profile, isLoading, error, refetch } = useProfile();
  const { user } = useAuth();
  const changePassword = useChangePassword();

  const passwordSchema = useMemo(() => createPasswordSchema(t), [t]);
  type PasswordFormData = z.infer<typeof passwordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitPassword = (data: PasswordFormData) => {
    changePassword.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  if (isLoading) return <LoadingState message={t('loading_profile')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  const name = profile?.name || user?.name || '—';
  const email = profile?.email || user?.email || '—';
  const phone = (profile as { phone?: string } | undefined)?.phone;
  const rawRole = ((profile?.role || user?.role) as JwtUser['role']) || 'guest';
  const role = normalizeRole(rawRole);
  const roleColor = getRoleColor(role);
  const tenantName = user?.tenant_name || '—';
  const tenantSlug = user?.tenant_slug || '';
  const userId = profile?.id ?? user?.id ?? '—';
  const initials = name.charAt(0).toUpperCase();

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('profile_tab')} />
        <Tab label={t('change_password')} />
      </Tabs>

      {tab === 0 && (
        <Box>
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <Paper
            sx={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[1],
              mb: 3,
            }}
          >
            <Box
              sx={{
                height: 120,
                position: 'relative',
                background: `linear-gradient(135deg, ${theme.palette.custom.brand.darker} 0%, ${theme.palette.custom.brand.dark} 45%, ${theme.palette.custom.brand.main} 100%)`,
              }}
            >
              <Box sx={{ position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
              <Box sx={{ position: 'absolute', right: 70, bottom: -70, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
            </Box>

            <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 2, md: 3 }, mt: -7, flexWrap: 'wrap' }}>
                <Avatar
                  sx={{
                    width: 104,
                    height: 104,
                    fontSize: '2.4rem',
                    fontWeight: 700,
                    bgcolor: roleColor,
                    border: `5px solid ${theme.palette.background.paper}`,
                    boxShadow: theme.shadows[2],
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ pb: 0.5, flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {email}
                  </Typography>
                </Box>
                <Chip
                  label={getRoleLabel(role)}
                  sx={{
                    mb: 0.5,
                    bgcolor: `${roleColor}1a`,
                    color: roleColor,
                    fontWeight: 600,
                    border: `1px solid ${roleColor}33`,
                  }}
                />
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <Box display="flex" gap={1.5} flexWrap="wrap">
                <Chip
                  size="small"
                  icon={<ApartmentOutlined sx={{ fontSize: 16 }} />}
                  label={tenantName}
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
                {tenantSlug && (
                  <Chip
                    size="small"
                    icon={<BadgeOutlined sx={{ fontSize: 16 }} />}
                    label={`@${tenantSlug}`}
                    variant="outlined"
                    sx={{ fontWeight: 500, color: 'text.secondary' }}
                  />
                )}
                {phone && (
                  <Chip
                    size="small"
                    icon={<PhoneOutlined sx={{ fontSize: 16 }} />}
                    label={phone}
                    variant="outlined"
                    sx={{ fontWeight: 500, color: 'text.secondary' }}
                  />
                )}
                <Chip
                  size="small"
                  icon={<BadgeOutlined sx={{ fontSize: 16 }} />}
                  label={`${t('user_id')}: #${String(userId)}`}
                  variant="outlined"
                  sx={{ fontWeight: 500, color: 'text.secondary' }}
                />
              </Box>
            </Box>
          </Paper>

          {/* ── Info cards ───────────────────────────────────────────────── */}
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <Paper
                sx={{
                  borderRadius: '14px',
                  border: `1px solid ${theme.palette.divider}`,
                  p: { xs: 2, md: 2.5 },
                  height: '100%',
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <PersonOutline sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                  {t('personal_info')}
                </Typography>
                <InfoRow icon={<BadgeOutlined fontSize="small" />} label={t('full_name')} value={name} />
                <Divider />
                <InfoRow icon={<EmailOutlined fontSize="small" />} label={t('email')} value={email} />
                <Divider />
                <InfoRow icon={<PhoneOutlined fontSize="small" />} label={t('phone')} value={phone ?? '—'} />
                <Divider />
                <InfoRow icon={<PersonOutline fontSize="small" />} label={t('role_label')} value={getRoleLabel(role)} />
              </Paper>
            </Grid>

            <Grid xs={12} md={6}>
              <Paper
                sx={{
                  borderRadius: '14px',
                  border: `1px solid ${theme.palette.divider}`,
                  p: { xs: 2, md: 2.5 },
                  height: '100%',
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <ApartmentOutlined sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                  {t('account_info')}
                </Typography>
                <InfoRow icon={<BadgeOutlined fontSize="small" />} label={t('user_id')} value={`#${String(userId)}`} />
                <Divider />
                <InfoRow icon={<ApartmentOutlined fontSize="small" />} label={t('clinic')} value={tenantName} />
                <Divider />
                <InfoRow icon={<EmailOutlined fontSize="small" />} label={t('email')} value={email} />
                <Divider />
                <InfoRow icon={<BadgeOutlined fontSize="small" />} label="Tenant" value={tenantSlug || '—'} />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {tab === 1 && (
        <Box component="form" onSubmit={handleSubmit(onSubmitPassword)} sx={{ maxWidth: 480 }}>
          {changePassword.isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>{t('password_changed_success')}</Alert>
          )}
          {changePassword.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>{t('password_change_error')}</Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label={t('current_password')}
            {...register('current_password')}
            error={!!errors.current_password}
            helperText={errors.current_password?.message}
            sx={{ mb: 2.5 }}
          />
          <TextField
            fullWidth
            type="password"
            label={t('new_password')}
            {...register('new_password')}
            error={!!errors.new_password}
            helperText={errors.new_password?.message}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<LockReset />}
            disabled={changePassword.isPending}
            sx={{ minWidth: 200 }}
          >
            {changePassword.isPending ? t('changing') : t('change_password')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
