import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, Divider } from '@mui/material';
import EventAvailable from '@mui/icons-material/EventAvailable';
import { BOOKING_STATUS_CONFIG } from '@/modules/bookings/types/booking.types';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { formatDate } from '@/shared/utils/localeUtils';
import type { FichaBooking } from './types';

interface BookingsTabProps {
  bookings: FichaBooking[];
}

export function BookingsTab({ bookings }: BookingsTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('bookings');

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : b.date.localeCompare(a.date))),
    [bookings],
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<EventAvailable sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
        title={t('patient_ficha:noBookings')}
        message={t('patient_ficha:noBookingsDesc')}
      />
    );
  }

  return (
    <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <List disablePadding>
        {sorted.map((booking, idx) => {
          const cfg = BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG] ?? BOOKING_STATUS_CONFIG.pending;
          return (
            <Box key={booking.id}>
              {idx > 0 && <Divider />}
              <ListItem sx={{ px: 2, py: 1.5 }}>
                <ListItemAvatar>
                  <Avatar sx={{ backgroundColor: `${cfg.color}18`, color: cfg.color, width: 40, height: 40, fontSize: 13, fontWeight: 600 }}>
                    {booking.time}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {booking.patient_name || booking.guest_name || t('patient', { defaultValue: 'Paciente' })}
                      </Typography>
                      <Chip
                        label={t(cfg.labelKey)}
                        size="small"
                        sx={{ backgroundColor: cfg.bgColor, color: cfg.color, fontSize: 11, fontWeight: 600 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {formatDate(booking.date)} &middot; {booking.time} &middot; {booking.duration || 30} min
                    </Typography>
                  }
                />
              </ListItem>
            </Box>
          );
        })}
      </List>
    </Paper>
  );
}
