import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Lock from '@mui/icons-material/Lock';
import Shield from '@mui/icons-material/Shield';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Devices from '@mui/icons-material/Devices';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useChangePassword } from '../hooks/useSettings';
import { useTwoFAStatus, useGenerateTwoFA, useVerifyTwoFA, useDisableTwoFA } from '@/modules/2fa/hooks/useTwoFA';
import { useAuth } from '@/shared/providers/AuthProvider';
import toast from 'react-hot-toast';

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Ingresa tu contraseña actual'),
    new_password: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirm_password: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function SecurityTab() {
  const theme = useTheme();
  const changePassword = useChangePassword();
  const { data: twoFAStatus, isLoading: loading2FA } = useTwoFAStatus();
  const generateTwoFA = useGenerateTwoFA();
  const verifyTwoFA = useVerifyTwoFA();
  const disableTwoFA = useDisableTwoFA();
  const { logoutAll } = useAuth();

  const [verifyCode, setVerifyCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

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
    setRevokingSessions(true);
    try {
      await logoutAll();
      toast.success('Todas las sesiones han sido revocadas');
    } catch {
      toast.error('Error al revocar sesiones');
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
          Cambiar Contraseña
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onPasswordSubmit)}>
        <TextField
          fullWidth
          type="password"
          label="Contraseña actual"
          {...register('current_password')}
          error={!!errors.current_password}
          helperText={errors.current_password?.message}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Nueva contraseña"
          {...register('new_password')}
          error={!!errors.new_password}
          helperText={errors.new_password?.message}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Confirmar nueva contraseña"
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
          {changePassword.isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* 2FA Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Shield sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          Autenticación de Dos Factores (2FA)
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
                La autenticación de dos factores está activa en tu cuenta.
              </Alert>
              <Button
                variant="outlined"
                color="error"
                disabled={disableTwoFA.isPending}
                onClick={handleDisable2FA}
              >
                {disableTwoFA.isPending ? 'Desactivando...' : 'Desactivar 2FA'}
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
                    Escanea este código QR con tu aplicación de autenticación:
                  </Typography>
                  <Box
                    component="img"
                    src={generateTwoFA.data.qr_code}
                    alt="QR Code 2FA"
                    sx={{ width: 200, height: 200, borderRadius: '10px', mb: 2 }}
                  />
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 2 }}>
                    Secreto: {generateTwoFA.data.secret}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Ingresa el código de 6 dígitos:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <TextField
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
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
                      {verifyTwoFA.isPending ? 'Verificando...' : 'Verificar'}
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                  La autenticación de dos factores agrega una capa extra de seguridad a tu cuenta.
                </Alert>
              )}

              {!showQR && (
                <Button
                  variant="contained"
                  startIcon={<Shield />}
                  onClick={handleEnable2FA}
                  disabled={generateTwoFA.isPending}
                >
                  {generateTwoFA.isPending ? 'Generando...' : 'Activar 2FA'}
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
          Sesiones Activas
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
        Esta acción cerrará sesión en todos los dispositivos donde estés conectado, incluyendo este navegador.
      </Alert>

      <Button
        variant="outlined"
        color="error"
        startIcon={<Devices />}
        disabled={revokingSessions}
        onClick={handleRevokeAllSessions}
      >
        {revokingSessions ? 'Revocando...' : 'Revocar Todas las Sesiones'}
      </Button>
    </Box>
  );
}
