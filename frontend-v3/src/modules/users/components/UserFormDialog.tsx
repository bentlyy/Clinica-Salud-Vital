import { useEffect } from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Close from '@mui/icons-material/Close';
import Save from '@mui/icons-material/Save';
import PersonAdd from '@mui/icons-material/PersonAdd';
import type { User, CreateUserInput, UserRole } from '../types/user.types';
import { getRoleLabel } from '@/shared/utils/role.utils';

const ROLE_OPTIONS: UserRole[] = ['admin', 'doctor', 'lab_technician', 'patient', 'user'];

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string().optional(),
  role: z.enum(['superadmin', 'admin', 'doctor', 'lab_technician', 'patient', 'guest', 'user'] as const),
});

const editSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al least 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string().optional(),
  role: z.enum(['superadmin', 'admin', 'doctor', 'lab_technician', 'patient', 'guest', 'user'] as const),
});

type UserFormData = z.infer<typeof createSchema>;

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSubmit: (data: CreateUserInput) => void;
  isPending: boolean;
}

export function UserFormDialog({ open, onClose, user, onSubmit, isPending }: UserFormDialogProps) {
  const isEdit = !!user;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
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
          border: '1px solid #e5e7eb',
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
              background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            {isEdit ? <Save fontSize="small" /> : <PersonAdd fontSize="small" />}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
              {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {isEdit ? 'Modifica la información del usuario' : 'Completa los datos para crear un usuario'}
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} sx={{ minWidth: 'auto', color: '#6b7280' }}>
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
                  label="Nombre completo"
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
                  label="Email"
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
                      backgroundColor: '#f9fafb',
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
                  label="Teléfono (opcional)"
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
                  label="Rol"
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
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? undefined : <Save />}
            sx={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              },
            }}
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
