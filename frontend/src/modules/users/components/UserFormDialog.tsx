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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Close from '@mui/icons-material/Close';
import Save from '@mui/icons-material/Save';
import PersonAdd from '@mui/icons-material/PersonAdd';
import { useTranslation } from 'react-i18next';
import type { User, CreateUserInput, UserRole } from '../types/user.types';
import { getRoleLabel } from '@/shared/utils/role.utils';

const ROLE_OPTIONS: UserRole[] = ['admin', 'doctor', 'lab_technician', 'patient', 'user'];

function createSchemas(t: (key: string) => string) {
  const roleEnum = z.enum(['superadmin', 'admin', 'doctor', 'lab_technician', 'patient', 'guest', 'user'] as const);
  return {
    create: z.object({
      name: z.string().min(2, t('name_min_length')),
      email: z.string().email(t('invalid_email')),
      phone: z.string().optional(),
      role: roleEnum,
    }),
    edit: z.object({
      name: z.string().min(2, t('name_min_length')),
      email: z.string().email(t('invalid_email')),
      phone: z.string().optional(),
      role: roleEnum,
    }),
  };
}

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSubmit: (data: CreateUserInput) => void;
  isPending: boolean;
}

export function UserFormDialog({ open, onClose, user, onSubmit, isPending }: UserFormDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const isEdit = !!user;

  const schemas = useMemo(() => createSchemas(t), [t]);
  type UserFormData = z.infer<typeof schemas.create>;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEdit ? schemas.edit : schemas.create),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'patient',
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          phone: user.phone ?? '',
          role: user.role,
        });
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          role: 'patient',
        });
      }
    }
  }, [open, user, reset]);

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit({
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone || undefined,
    });
  };

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
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.background.paper,
            }}
          >
            {isEdit ? <Save fontSize="small" /> : <PersonAdd fontSize="small" />}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {isEdit ? t('editUser') : t('newUser')}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {isEdit ? t('edit_user_subtitle') : t('create_user_subtitle')}
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} sx={{ minWidth: 'auto', color: theme.palette.text.secondary }}>
          <Close />
        </Button>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
                  disabled={isEdit}
                  slotProps={{
                    input: {
                      readOnly: isEdit,
                    },
                  }}
                  sx={{
                    '& .MuiInputBase-root.Mui-disabled': {
                      backgroundColor: theme.palette.custom.surface.muted,
                    },
                  }}
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
                >
                  {ROLE_OPTIONS.map((role) => (
                    <MenuItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={isPending}
          >
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? undefined : <Save />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
              },
            }}
          >
            {isPending ? t('saving') : isEdit ? t('saveChanges') : t('createUser')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
