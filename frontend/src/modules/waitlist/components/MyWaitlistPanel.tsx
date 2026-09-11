import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import { useMyWaitlist, useLeaveWaitlist } from '../hooks/useWaitlist';
import { formatDate } from '@/shared/utils/localeUtils';

export function MyWaitlistPanel() {
  const { t } = useTranslation('waitlist');
  const theme = useTheme();
  const { data: entries, isLoading } = useMyWaitlist();
  const leaveMutation = useLeaveWaitlist();

  if (isLoading) return null;
  if (!entries || entries.length === 0) return null;

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '12px',
        backgroundColor: theme.palette.custom.surface.muted,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <HourglassEmpty sx={{ fontSize: 20, color: theme.palette.primary.main }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {t('my_waitlist', 'Mi lista de espera')}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {entries.map((entry) => (
          <Box
            key={entry.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              p: 1.5,
              borderRadius: '8px',
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {entry.doctor_name || t('doctor_fallback', { id: entry.doctor_id })}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {formatDate(entry.requested_date)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={t(`status_${entry.status}`, entry.status)}
                sx={{
                  backgroundColor: theme.palette.custom.status.info.bg,
                  color: theme.palette.custom.status.info.text,
                  fontWeight: 600,
                }}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={leaveMutation.isPending}
                onClick={() => leaveMutation.mutate(entry.id)}
                sx={{ borderColor: theme.palette.grey[300], color: theme.palette.text.secondary, textTransform: 'none' }}
              >
                {t('leave', 'Salir')}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}