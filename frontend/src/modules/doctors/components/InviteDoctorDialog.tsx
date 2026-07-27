import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Close from '@mui/icons-material/Close';
import Send from '@mui/icons-material/Send';
import Mail from '@mui/icons-material/Mail';
import type { Doctor } from '../types/doctor.types';

const inviteSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteDoctorDialogProps {
  open: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onSubmit: (data: { id: number; email: string }) => void;
  isPending: boolean;
}

export function InviteDoctorDialog({ open, onClose, doctor, onSubmit, isPending }: InviteDoctorDialogProps) {
  const theme = useTheme();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: doctor?.email ?? '',
    },
  });

  useEffect(() => {
    if (open && doctor) {
      reset({ email: doctor.email });
    }
  }, [open, doctor, reset]);

  const handleFormSubmit = (data: InviteFormData) => {
    if (!doctor) return;
    onSubmit({ id: doctor.id, email: data.email });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, #f59e0b 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Mail fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              Invitar Doctor
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Se enviará un enlace de invitación por email
            </Typography>
          </Box>
        </Box>
        <Button onClick={onClose} sx={{ minWidth: 'auto', color: theme.palette.text.secondary }}>
          <Close />
        </Button>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          {doctor && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                backgroundColor: '#f9fafb',
                borderRadius: '10px',
                border: `1px solid ${theme.palette.grey[100]}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                Dr. {doctor.name}
              </Typography>
              {doctor.specialty && (
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {doctor.specialty}
                </Typography>
              )}
            </Box>
          )}

          <TextField
            {...register('email')}
            label="Email del doctor"
            type="email"
            fullWidth
            error={!!errors.email}
            helperText={errors.email?.message}
            placeholder="doctor@ejemplo.com"
          />

          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 1.5, display: 'block' }}>
            El doctor recibirá un email con un enlace para crear su contraseña y activar su cuenta.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? undefined : <Send />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, #f59e0b 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 100%)`,
              },
            }}
          >
            {isPending ? 'Enviando...' : 'Enviar Invitación'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
