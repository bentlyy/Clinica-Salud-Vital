import { useState } from 'react';
import { Box, Avatar, Typography, Divider, Tabs, Tab, TextField, Button, Alert } from '@mui/material';
import LockReset from '@mui/icons-material/LockReset';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile, useChangePassword } from '../hooks/useSettings';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';

const passwordSchema = z.object({
  current_password: z.string().min(1, 'La contraseña actual es requerida'),
  new_password: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.current_password !== data.new_password, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['new_password'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function ProfileTab() {
  const [tab, setTab] = useState(0);
  const { data: profile, isLoading, error, refetch } = useProfile();
  const changePassword = useChangePassword();

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

  if (isLoading) return <LoadingState message="Cargando perfil..." />;
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
            backgroundColor: '#0d9488',
            border: '3px solid #f0fdfa',
          }}
        >
          {profile?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
            {profile?.name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {profile?.email}
          </Typography>
          {profile?.role && (
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              Rol: {profile.role}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Perfil" />
        <Tab label="Cambiar Contraseña" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ maxWidth: 480 }}>
          <TextField fullWidth label="Nombre" value={profile?.name || ''} disabled sx={{ mb: 2.5 }} />
          <TextField fullWidth label="Correo electrónico" value={profile?.email || ''} disabled helperText="El correo no se puede cambiar" sx={{ mb: 2.5 }} />
          <TextField fullWidth label="Teléfono" value={((profile as unknown) as Record<string, unknown>)?.phone || ''} disabled helperText="Contacte al administrador para actualizar" />
        </Box>
      )}

      {tab === 1 && (
        <Box component="form" onSubmit={handleSubmit(onSubmitPassword)} sx={{ maxWidth: 480 }}>
          {changePassword.isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>Contraseña cambiada correctamente</Alert>
          )}
          {changePassword.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>Error al cambiar la contraseña. Verifique su contraseña actual.</Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="Contraseña actual"
            {...register('current_password')}
            error={!!errors.current_password}
            helperText={errors.current_password?.message}
            sx={{ mb: 2.5 }}
          />
          <TextField
            fullWidth
            type="password"
            label="Nueva contraseña"
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
            {changePassword.isPending ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
