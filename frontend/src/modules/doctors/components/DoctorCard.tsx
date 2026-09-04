import { Box, Card, CardContent, Avatar, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Edit from '@mui/icons-material/Edit';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Mail from '@mui/icons-material/Mail';
import People from '@mui/icons-material/People';
import EventNote from '@mui/icons-material/EventNote';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/shared/utils/localeUtils';
import type { Doctor, DoctorStats } from '../types/doctor.types';

interface DoctorCardProps {
  doctor: Doctor;
  stats?: DoctorStats;
  onEdit: (doctor: Doctor) => void;
  onViewSchedule: (doctor: Doctor) => void;
  onInvite: (doctor: Doctor) => void;
  canEdit: boolean;
  canInvite: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0)?.toUpperCase() ?? '')
    .join('');
}

function getDoctorColor(id: number, fallbackColor: string): string {
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#d97706', '#059669', '#e11d48', '#0891b2'];
  return colors[id % colors.length] ?? fallbackColor;
}

export function DoctorCard({ doctor, stats, onEdit, onViewSchedule, onInvite, canEdit, canInvite }: DoctorCardProps) {
  const theme = useTheme();
  const { t } = useTranslation('doctors');
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              backgroundColor: getDoctorColor(doctor.id, theme.palette.text.secondary),
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
            src={doctor.avatar_url}
          >
            {getInitials(doctor.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.3 }}>
              Dr. {doctor.name}
            </Typography>
            {doctor.specialty && (
              <Chip
                label={doctor.specialty}
                size="small"
                sx={{
                  mt: 0.5,
                  fontWeight: 500,
                  backgroundColor: theme.palette.custom.brand.lightest,
                  color: theme.palette.primary.main,
                  border: `1px solid ${theme.palette.custom.brand.lighter}`,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Stats */}
        {stats && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.5,
              mb: 2,
              p: 1.5,
              backgroundColor: theme.palette.custom.surface.muted,
              borderRadius: '10px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ fontSize: 16, color: theme.palette.info.main }} />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1 }}>
                  {t('patients')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {stats.total_patients}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventNote sx={{ fontSize: 16, color: theme.palette.primary.main }} />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1 }}>
                  {t('today_appointments')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {stats.today_appointments}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Info */}
        <Box sx={{ mb: 2 }}>
          {doctor.license_number && (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
              {t('license')}: {doctor.license_number}
            </Typography>
          )}
          {doctor.consultation_fee !== undefined && doctor.consultation_fee !== null && (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
              {t('consultation')}: {formatCurrency(doctor.consultation_fee)}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1, borderTop: `1px solid ${theme.palette.grey[100]}` }}>
          {canEdit && (
            <Tooltip title={t('edit')}>
              <IconButton
                size="small"
                onClick={() => onEdit(doctor)}
                sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.primary.main, backgroundColor: theme.palette.custom.brand.lightest } }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('view_schedule')}>
            <IconButton
              size="small"
              onClick={() => onViewSchedule(doctor)}
              sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.info.main, backgroundColor: theme.palette.custom.status.info.bg } }}
            >
              <CalendarMonth fontSize="small" />
            </IconButton>
          </Tooltip>
          {canInvite && !doctor.user_id && (
            <Tooltip title={t('send_invite')}>
              <IconButton
                size="small"
                onClick={() => onInvite(doctor)}
                sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.warning.main, backgroundColor: theme.palette.custom.status.warning.bg } }}
              >
                <Mail fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
