import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Avatar, Typography, Divider, Tabs, Tab, TextField, Button, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockReset from '@mui/icons-material/LockReset';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile, useChangePassword } from '../hooks/useSettings';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';

function createPasswordSchema(t: (key: string) => string) {
  return z.object({
    current_password: z.string().min(1, t('current_password_required')),
    new_password: z.string().min(6, t('password_min_length_profile')),
  }).refine((data) => data.current_password !== data.new_password, {
    message: t('password_must_differ'),
    path: ['new_password'],
  });
}

export function ProfileTab() {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const { data: profile, isLoading, error, refetch } = useProfile();
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

  return (
    <Box>
      {/* Avatar Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
        <Avatar
          sx={{
            width: 96,
            height: 96,
            fontSize: '2rem',
            backgroundColor: theme.palette.primary.main,
            border: `3px solid ${theme.palette.custom.brand.lightest}`,
          }}
        >
          {profile?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {profile?.name}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {profile?.email}
          </Typography>
          {profile?.role && (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {t('role_label')}: {profile.role}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('profile_tab')} />
        <Tab label={t('change_password')} />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ maxWidth: 480 }}>
          <TextField fullWidth label={t('name')} value={profile?.name || ''} disabled sx={{ mb: 2.5 }} />
          <TextField fullWidth label={t('email')} value={profile?.email || ''} disabled helperText={t('email_cannot_change')} sx={{ mb: 2.5 }} />
          <TextField fullWidth label={t('phone')} value={((profile as unknown) as Record<string, unknown>)?.phone || ''} disabled helperText={t('contact_admin_to_update')} />
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
