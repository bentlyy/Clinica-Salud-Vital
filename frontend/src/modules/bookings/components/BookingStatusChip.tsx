import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { BookingStatus } from '../types/booking.types';

interface BookingStatusChipProps {
  status: BookingStatus;
  size?: 'small' | 'medium';
}

export function BookingStatusChip({ status, size = 'small' }: BookingStatusChipProps) {
  const theme = useTheme();
  const { t } = useTranslation('bookings');

  const CONFIG: Record<BookingStatus, { color: string; bgColor: string; labelKey: string }> = {
    pending: { color: theme.palette.custom.status.warning.text, bgColor: theme.palette.custom.status.warning.bg, labelKey: 'statusLabels.pending' },
    confirmed: { color: theme.palette.primary.main, bgColor: theme.palette.custom.brand.lightest, labelKey: 'statusLabels.confirmed' },
    cancelled: { color: theme.palette.error.main, bgColor: theme.palette.custom.status.error.bg, labelKey: 'statusLabels.cancelled' },
    completed: { color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg, labelKey: 'statusLabels.completed' },
    no_show: { color: theme.palette.text.secondary, bgColor: theme.palette.custom.surface.sunken, labelKey: 'statusLabels.no_show' },
  };

  const c = CONFIG[status] ?? CONFIG.pending;

  return (
    <Chip
      label={t(c.labelKey)}
      size={size}
      sx={{
        backgroundColor: c.bgColor,
        color: c.color,
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.7rem',
      }}
    />
  );
}