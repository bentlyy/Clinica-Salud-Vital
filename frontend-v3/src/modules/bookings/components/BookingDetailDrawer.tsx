import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import PersonOutline from '@mui/icons-material/PersonOutline';
import LocalHospital from '@mui/icons-material/LocalHospital';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccessTime from '@mui/icons-material/AccessTime';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import type { Booking } from '../types/booking.types';
import { BOOKING_STATUS_CONFIG } from '../types/booking.types';

interface BookingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel?: (id: number) => void;
  isCancelling?: boolean;
}

export function BookingDetailDrawer({
  open,
  onClose,
  booking,
  onCancel,
  isCancelling = false,
}: BookingDetailDrawerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!booking) return null;

  const statusConfig = BOOKING_STATUS_CONFIG[booking.status];
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const patientLabel = booking.patient_name || booking.guest_name || 'Sin nombre';

  const handleCancelConfirm = () => {
    onCancel?.(booking.id);
    setConfirmOpen(false);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            borderTopLeftRadius: '16px',
            borderBottomLeftRadius: '16px',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
              Detalle de Cita
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close sx={{ color: '#6b7280' }} />
            </IconButton>
          </Box>

          {/* Status badge */}
          <Chip
            label={statusConfig.label}
            sx={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
              fontWeight: 600,
              mb: 3,
            }}
          />

          <Divider sx={{ mb: 3 }} />

          {/* Patient info */}
          <DetailSection icon={<PersonOutline />} label="Paciente / Invitado">
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#1f2937' }}>
              {patientLabel}
            </Typography>
            {booking.guest_email && (
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                {booking.guest_email}
              </Typography>
            )}
            {booking.guest_phone && (
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                {booking.guest_phone}
              </Typography>
            )}
          </DetailSection>

          {/* Doctor info */}
          <DetailSection icon={<LocalHospital />} label="Doctor">
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#1f2937' }}>
              {booking.doctor_name || 'No especificado'}
            </Typography>
          </DetailSection>

          {/* Date & time */}
          <DetailSection icon={<CalendarToday />} label="Fecha">
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#1f2937' }}>
              {new Date(booking.date + 'T00:00:00').toLocaleDateString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </DetailSection>

          <DetailSection icon={<AccessTime />} label="Horario">
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#1f2937' }}>
              {booking.time} ({booking.duration} min)
            </Typography>
          </DetailSection>

          {/* Notes */}
          {booking.notes && (
            <DetailSection icon={<NotesOutlined />} label="Notas">
              <Typography variant="body2" sx={{ color: '#374151' }}>
                {booking.notes}
              </Typography>
            </DetailSection>
          )}

          {/* Timestamps */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
            Creada: {new Date(booking.created_at).toLocaleString('es-CL')}
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
            Actualizada: {new Date(booking.updated_at).toLocaleString('es-CL')}
          </Typography>

          {/* Cancel button */}
          {canCancel && onCancel && (
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<CancelOutlined />}
              onClick={() => setConfirmOpen(true)}
              disabled={isCancelling}
              sx={{
                mt: 3,
                py: 1.5,
                borderColor: '#fca5a5',
                color: '#ef4444',
                '&:hover': {
                  borderColor: '#ef4444',
                  backgroundColor: '#fef2f2',
                },
              }}
            >
              Cancelar Cita
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb' } }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
            Cancelar Cita
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#374151' }}>
            ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ color: '#6b7280' }}
          >
            No, mantener
          </Button>
          <Button
            onClick={handleCancelConfirm}
            variant="contained"
            color="error"
            disabled={isCancelling}
            sx={{ px: 3 }}
          >
            {isCancelling ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Sí, cancelar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function DetailSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center', '& svg': { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}
