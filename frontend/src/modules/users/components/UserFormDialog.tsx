import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Close from '@mui/icons-material/Close';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Send from '@mui/icons-material/Send';
import { useTranslation } from 'react-i18next';
import type { CreateUserInput, UserRole } from '../types/user.types';
import { getRoleLabel } from '@/shared/utils/role.utils';

const CREATABLE_ROLES: UserRole[] = ['doctor', 'lab_technician', 'patient'];

function createSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(2, t('name_min_length')),
      email: z.string().email(t('invalid_email')),
      role: z.enum(['doctor', 'lab_technician', 'patient']),
      specialty: z.string().optional(),
      rut: z.string().optional(),
      phone: z.string().optional(),
    })
    .refine((data) => data.role !== 'doctor' || (data.specialty ?? '').length > 0, {
      path: ['specialty'],
      message: t('specialty_required'),
    });
}

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserInput) => void;
  isPending: boolean;
}

export function UserFormDialog({ open, onClose, onSubmit, isPending }: UserFormDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');

  const schema = useMemo(() => createSchema(t), [t]);
  type UserFormData = z.infer<typeof schema>;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      role: 'doctor',
      specialty: '',
      rut: '',
      phone: '',
    },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        email: '',
        role: 'doctor',
        specialty: '',
        rut: '',
        phone: '',
      });
    }
  }, [open, reset]);

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit({
      name: data.name,
      email: data.email,
      role: data.role,
      specialty: data.role === 'doctor' ? data.specialty : undefined,
      rut: data.role === 'doctor' ? data.rut || undefined : undefined,
      phone: data.role === 'doctor' ? data.phone || undefined : undefined,
    });
  };

  const isInvite = selectedRole !== 'doctor';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.background.paper,
            }}
          >
            <PersonAdd fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {t('newUser')}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {t('create_user_subtitle')}
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} sx={{ minWidth: 'auto', color: theme.palette.text.secondary }}>
          <Close />
        </Button>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('fullName')}
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={tc('email')}
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label={t('role')}
                    fullWidth
                    error={!!errors.role}
                    helperText={errors.role?.message}
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                  >
                    {CREATABLE_ROLES.map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {selectedRole === 'doctor' && (
                <>
                  <Controller
                    name="specialty"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('specialty')}
                        fullWidth
                        error={!!errors.specialty}
                        helperText={errors.specialty?.message}
                        sx={{ gridColumn: { sm: '1 / -1' } }}
                      />
                    )}
                  />

                  <Controller
                    name="rut"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('rut')}
                        placeholder="12.345.678-9"
                        fullWidth
                        error={!!errors.rut}
                        helperText={errors.rut?.message}
                      />
                    )}
                  />

                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={t('phone_optional')}
                        fullWidth
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </>
              )}
            </Box>

            {isInvite && (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                <Typography variant="body2">{t('invite_explainer')}</Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={isPending}>
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? undefined : isInvite ? <Send /> : <PersonAdd />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
              },
            }}
          >
            {isPending ? t('saving') : isInvite ? t('sendInvite') : t('createUser')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
