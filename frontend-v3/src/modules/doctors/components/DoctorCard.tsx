import { Box, Card, CardContent, Avatar, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Mail from '@mui/icons-material/Mail';
import People from '@mui/icons-material/People';
import EventNote from '@mui/icons-material/EventNote';
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

function getDoctorColor(id: number): string {
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#d97706', '#059669', '#e11d48', '#0891b2'];
  return colors[id % colors.length] ?? '#6b7280';
}

export function DoctorCard({ doctor, stats, onEdit, onViewSchedule, onInvite, canEdit, canInvite }: DoctorCardProps) {
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
              backgroundColor: getDoctorColor(doctor.id),
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
            src={doctor.avatar_url}
          >
            {getInitials(doctor.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.3 }}>
              Dr. {doctor.name}
            </Typography>
            {doctor.specialty && (
              <Chip
                label={doctor.specialty}
                size="small"
                sx={{
                  mt: 0.5,
                  fontWeight: 500,
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  border: '1px solid #ccfbf1',
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
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ fontSize: 16, color: '#2563eb' }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', lineHeight: 1 }}>
                  Pacientes
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stats.total_patients}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventNote sx={{ fontSize: 16, color: '#0d9488' }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', lineHeight: 1 }}>
                  Citas Hoy
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stats.today_appointments}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Info */}
        <Box sx={{ mb: 2 }}>
          {doctor.license_number && (
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
              Licencia: {doctor.license_number}
            </Typography>
          )}
          {doctor.consultation_fee !== undefined && doctor.consultation_fee !== null && (
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
              Consulta: ${doctor.consultation_fee.toLocaleString('es-CL')}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1, borderTop: '1px solid #f3f4f6' }}>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => onEdit(doctor)}
                sx={{ color: '#6b7280', '&:hover': { color: '#0d9488', backgroundColor: '#f0fdfa' } }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Ver horarios">
            <IconButton
              size="small"
              onClick={() => onViewSchedule(doctor)}
              sx={{ color: '#6b7280', '&:hover': { color: '#2563eb', backgroundColor: '#eff6ff' } }}
            >
              <CalendarMonth fontSize="small" />
            </IconButton>
          </Tooltip>
          {canInvite && !doctor.user_id && (
            <Tooltip title="Enviar invitación">
              <IconButton
                size="small"
                onClick={() => onInvite(doctor)}
                sx={{ color: '#6b7280', '&:hover': { color: '#d97706', backgroundColor: '#fffbeb' } }}
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
