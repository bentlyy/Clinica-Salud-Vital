import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Lock from '@mui/icons-material/Lock';
import Shield from '@mui/icons-material/Shield';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Devices from '@mui/icons-material/Devices';
import Logout from '@mui/icons-material/Logout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useChangePassword, useSessions, useRevokeSession } from '../hooks/useSettings';
import { useTwoFAStatus, useGenerateTwoFA, useVerifyTwoFA, useDisableTwoFA } from '@/modules/2fa/hooks/useTwoFA';
import { useAuth } from '@/shared/providers/AuthProvider';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

function createPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      current_password: z.string().min(1, t('current_password_required')),
      new_password: z.string().min(8, t('password_min_length')),
      confirm_password: z.string().min(1, t('confirm_password_required')),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: t('passwords_dont_match'),
      path: ['confirm_password'],
    });
}

export function SecurityTab() {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const changePassword = useChangePassword();
  const { data: twoFAStatus, isLoading: loading2FA } = useTwoFAStatus();
  const generateTwoFA = useGenerateTwoFA();
  const verifyTwoFA = useVerifyTwoFA();
  const disableTwoFA = useDisableTwoFA();
  const { logoutAll } = useAuth();
  const { data: sessions, isLoading: loadingSessions } = useSessions();
  const revokeSession = useRevokeSession();

  const passwordSchema = useMemo(() => createPasswordSchema(t), [t]);
  type PasswordFormData = z.infer<typeof passwordSchema>;

  const [verifyCode, setVerifyCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [confirmRevokeAllOpen, setConfirmRevokeAllOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePassword.mutate(
      { current_password: data.current_password, new_password: data.new_password },
      { onSuccess: () => reset() },
    );
  };

  const handleEnable2FA = () => {
    generateTwoFA.mutate(undefined, {
      onSuccess: () => setShowQR(true),
    });
  };

  const handleVerify2FA = () => {
    if (verifyCode.length === 6) {
      verifyTwoFA.mutate(verifyCode, {
        onSuccess: () => {
          setShowQR(false);
          setVerifyCode('');
        },
      });
    }
  };

  const handleDisable2FA = () => {
    disableTwoFA.mutate();
  };

  const handleRevokeAllSessions = async () => {
    setConfirmRevokeAllOpen(false);
    setRevokingSessions(true);
    try {
      await logoutAll();
      toast.success(t('sessions_revoked'));
    } catch {
      toast.error(t('sessions_revoke_error'));
    } finally {
      setRevokingSessions(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      {/* Password Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Lock sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {t('change_password')}
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onPasswordSubmit)}>
        <TextField
          fullWidth
          type="password"
          label={t('current_password')}
          {...register('current_password')}
          error={!!errors.current_password}
          helperText={errors.current_password?.message}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label={t('new_password')}
          {...register('new_password')}
          error={!!errors.new_password}
          helperText={errors.new_password?.message}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label={t('confirm_new_password')}
          {...register('confirm_password')}
          error={!!errors.confirm_password}
          helperText={errors.confirm_password?.message}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={changePassword.isPending}
          sx={{ minWidth: 180 }}
        >
          {changePassword.isPending ? t('changing') : t('change_password')}
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* 2FA Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Shield sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {t('two_factor_auth')}
        </Typography>
      </Box>

      {loading2FA ? (
        <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
      ) : (
        <Box>
          {twoFAStatus?.enabled ? (
            <Box>
              <Alert
                severity="success"
                icon={<VerifiedUser />}
                sx={{ mb: 2, borderRadius: '10px' }}
              >
                {t('2fa_active_message')}
              </Alert>
              <Button
                variant="outlined"
                color="error"
                disabled={disableTwoFA.isPending}
                onClick={handleDisable2FA}
              >
                {disableTwoFA.isPending ? t('disabling') : t('disable_2fa')}
              </Button>
            </Box>
          ) : (
            <Box>
              {showQR && generateTwoFA.data ? (
                <Paper
                  sx={{
                    p: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '14px',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                    {t('scan_qr_code')}
                  </Typography>
                  <Box
                    component="img"
                    src={generateTwoFA.data.qr_code}
                    alt={t('qrCode2fa')}
                    sx={{ width: 200, height: 200, borderRadius: '10px', mb: 2 }}
                  />
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 2 }}>
                    {t('secret')}: {generateTwoFA.data.secret}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    {t('enter_6_digit_code')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <TextField
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      aria-label={t('enter_6_digit_code', 'Código de verificación de 6 dígitos')}
                      inputProps={{
                        maxLength: 6,
                        style: {
                          textAlign: 'center',
                          fontSize: '1.25rem',
                          letterSpacing: '0.3em',
                          fontWeight: 600,
                        },
                      }}
                      sx={{ width: 200 }}
                    />
                    <Button
                      variant="contained"
                      disabled={verifyCode.length !== 6 || verifyTwoFA.isPending}
                      onClick={handleVerify2FA}
                    >
                      {verifyTwoFA.isPending ? t('verifying') : t('verify')}
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                  {t('2fa_info_message')}
                </Alert>
              )}

              {!showQR && (
                <Button
                  variant="contained"
                  startIcon={<Shield />}
                  onClick={handleEnable2FA}
                  disabled={generateTwoFA.isPending}
                >
                  {generateTwoFA.isPending ? t('generating') : t('enable_2fa')}
                </Button>
              )}
            </Box>
          )}
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Sessions Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Devices sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {t('active_sessions')}
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
        {t('revoke_sessions_warning')}
      </Alert>

      <Button
        variant="outlined"
        color="error"
        startIcon={<Devices />}
        disabled={revokingSessions}
        onClick={() => setConfirmRevokeAllOpen(true)}
      >
        {revokingSessions ? t('revoking') : t('revoke_all_sessions')}
      </Button>

      {loadingSessions ? (
        <Box sx={{ display: 'flex', mt: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <List sx={{ mt: 1 }}>
          {(sessions ?? []).map((session) => (
            <ListItem
              key={session.id}
              divider
              sx={{ px: 0 }}
            >
              <ListItemText
                primary={session.device || t('unknown_device', { defaultValue: 'Dispositivo desconocido' })}
                secondary={
                  `${session.ip_address || ''}${session.ip_address && session.last_activity ? ' · ' : ''}` +
                  (session.last_activity
                    ? t('active_on', { defaultValue: 'Activo el ' }) +
                      new Date(session.last_activity).toLocaleString()
                    : t('never_active', { defaultValue: 'Sin actividad reciente' }))
                }
              />
              <ListItemSecondaryAction>
                {session.revoked_at ? (
                  <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                    {t('revoked', { defaultValue: 'Revocada' })}
                  </Typography>
                ) : (
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    disabled={revokeSession.isPending}
                    onClick={() => revokeSession.mutate(session.id)}
                    aria-label={t('revoke_session', { defaultValue: 'Revocar sesión' })}
                  >
                    <Logout fontSize="small" />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <ConfirmDialog
        open={confirmRevokeAllOpen}
        onClose={() => setConfirmRevokeAllOpen(false)}
        onConfirm={handleRevokeAllSessions}
        title={t('revoke_all_title', { defaultValue: 'Revocar todas las sesiones' })}
        message={t('revoke_sessions_warning')}
        confirmLabel={t('revoke_all_sessions')}
        loading={revokingSessions}
      />
    </Box>
  );
}
