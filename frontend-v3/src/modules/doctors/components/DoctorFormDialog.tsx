import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Close from '@mui/icons-material/Close';
import Save from '@mui/icons-material/Save';
import LocalHospital from '@mui/icons-material/LocalHospital';
import type { Doctor, CreateDoctorInput } from '../types/doctor.types';

const doctorSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  specialty: z.string().optional(),
  license_number: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  consultation_fee: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'El monto debe ser positivo').optional(),
  ),
});

type DoctorFormData = z.infer<typeof doctorSchema>;

interface DoctorFormDialogProps {
  open: boolean;
  onClose: () => void;
  doctor?: Doctor | null;
  onSubmit: (data: CreateDoctorInput) => void;
  isPending: boolean;
}

export function DoctorFormDialog({ open, onClose, doctor, onSubmit, isPending }: DoctorFormDialogProps) {
  const isEdit = !!doctor;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: '',
      email: '',
      specialty: '',
      license_number: '',
      phone: '',
      bio: '',
      consultation_fee: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      if (doctor) {
        reset({
          name: doctor.name,
          email: doctor.email,
          specialty: doctor.specialty ?? '',
          license_number: doctor.license_number ?? '',
          phone: doctor.phone ?? '',
          bio: doctor.bio ?? '',
          consultation_fee: doctor.consultation_fee,
        });
      } else {
        reset({
          name: '',
          email: '',
          specialty: '',
          license_number: '',
          phone: '',
          bio: '',
          consultation_fee: undefined,
        });
      }
    }
  }, [open, doctor, reset]);

  const handleFormSubmit = (data: DoctorFormData) => {
    onSubmit({
      name: data.name,
      email: data.email,
      specialty_id: undefined,
      license_number: data.license_number || undefined,
      phone: data.phone || undefined,
      bio: data.bio || undefined,
      consultation_fee: data.consultation_fee,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', border: '1px solid #e5e7eb' },
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
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <LocalHospital fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
              {isEdit ? 'Editar Doctor' : 'Nuevo Doctor'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {isEdit ? 'Modifica la información del doctor' : 'Completa los datos para registrar un doctor'}
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
                    input: { readOnly: isEdit },
                  }}
                  sx={{ '& .MuiInputBase-root.Mui-disabled': { backgroundColor: '#f9fafb' } }}
                />
              )}
            />

            <Controller
              name="specialty"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Especialidad"
                  fullWidth
                  error={!!errors.specialty}
                  helperText={errors.specialty?.message}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="license_number"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="N° de Licencia"
                    fullWidth
                    error={!!errors.license_number}
                    helperText={errors.license_number?.message}
                  />
                )}
              />
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Teléfono"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                  />
                )}
              />
            </Box>

            <Controller
              name="consultation_fee"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tarifa de consulta (CLP)"
                  type="number"
                  fullWidth
                  error={!!errors.consultation_fee}
                  helperText={errors.consultation_fee?.message}
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ color: '#9ca3af', mr: 0.5 }}>$</Typography>,
                    },
                  }}
                />
              )}
            />

            <Controller
              name="bio"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Biografía / Descripción"
                  multiline
                  rows={3}
                  fullWidth
                  error={!!errors.bio}
                  helperText={errors.bio?.message}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={isPending}>
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
            {isPending ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Doctor'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
