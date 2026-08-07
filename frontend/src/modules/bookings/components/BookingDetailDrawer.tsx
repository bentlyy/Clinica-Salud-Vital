import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
import { formatDate, formatDateTime } from '@/shared/utils/localeUtils';

interface BookingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel?: (id: number, reason?: string) => void;
  isCancelling?: boolean;
}

export function BookingDetailDrawer({
  open,
  onClose,
  booking,
  onCancel,
  isCancelling = false,
}: BookingDetailDrawerProps) {
  const { t } = useTranslation('bookings');
  const theme = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!booking) return null;

  const statusConfig = BOOKING_STATUS_CONFIG[booking.status];
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const patientLabel = booking.patient_name || booking.guest_name || t('without_name');

  const handleCancelConfirm = () => {
    onCancel?.(booking.id, cancelReason.trim() || undefined);
    setConfirmOpen(false);
    setCancelReason('');
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
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {t('bookingDetail')}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close sx={{ color: theme.palette.text.secondary }} />
            </IconButton>
          </Box>

          {/* Status badge */}
          <Chip
            label={t(statusConfig.labelKey)}
            sx={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
              fontWeight: 600,
              mb: 3,
            }}
          />

          <Divider sx={{ mb: 3 }} />

          {/* Patient info */}
          <DetailSection icon={<PersonOutline />} label={t('patient_guest')}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {patientLabel}
            </Typography>
            {booking.guest_email && (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {booking.guest_email}
              </Typography>
            )}
            {booking.guest_phone && (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {booking.guest_phone}
              </Typography>
            )}
          </DetailSection>

          {/* Doctor info */}
          <DetailSection icon={<LocalHospital />} label={t('doctor')}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {booking.doctor_name || t('not_specified')}
            </Typography>
          </DetailSection>

          {/* Date & time */}
          <DetailSection icon={<CalendarToday />} label={t('date')}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {formatDate(new Date(booking.date + 'T00:00:00'), {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </DetailSection>

          <DetailSection icon={<AccessTime />} label={t('time')}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {booking.time} ({booking.duration} min)
            </Typography>
          </DetailSection>

          {/* Notes */}
          {booking.notes && (
            <DetailSection icon={<NotesOutlined />} label={t('notes')}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {booking.notes}
              </Typography>
            </DetailSection>
          )}

          {/* Cancellation info */}
          {booking.status === 'cancelled' && (booking.cancel_reason || booking.cancelled_at) && (
            <DetailSection icon={<CancelOutlined />} label={t('cancellationInfo')}>
              {booking.cancel_reason && (
                <Typography variant="body2" sx={{ color: theme.palette.error.main }}>
                  {booking.cancel_reason}
                </Typography>
              )}
              {booking.cancelled_at && (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {t('cancelledOn')}: {formatDateTime(booking.cancelled_at)}
                </Typography>
              )}
            </DetailSection>
          )}

          {/* Timestamps */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
            {t('created')}: {formatDateTime(booking.created_at)}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
            {t('updated')}: {formatDateTime(booking.updated_at)}
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
                borderColor: theme.palette.error.light,
                color: theme.palette.error.main,
                '&:hover': {
                  borderColor: theme.palette.error.main,
                  backgroundColor: theme.palette.error.light,
                },
              }}
            >
              {t('cancelBooking')}
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', border: `1px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('cancelBooking')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            {t('confirm_cancel_message')}
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            maxRows={4}
            label={t('cancelReason')}
            placeholder={t('cancelReasonPlaceholder')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            inputProps={{ maxLength: 255 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ color: theme.palette.text.secondary }}
          >
            {t('no_keep')}
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
              t('yes_cancel')
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
  const theme = useTheme();
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ color: theme.palette.text.secondary, display: 'flex', alignItems: 'center', '& svg': { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}
