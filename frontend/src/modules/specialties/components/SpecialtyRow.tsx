import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import MedicalServices from '@mui/icons-material/MedicalServices';
import type { Specialty } from '../types/specialty.types';
import {
  SpecialtyIcon,
  DepartmentChip,
  ProcedureBadge,
  DoctorAvatarGroup,
  getSpecialtyColor,
  RowCardMotion,
} from './SpecialtyVisuals';
import { formatDate } from '@/shared/utils/localeUtils';

interface SpecialtyRowProps {
  specialty: Specialty;
  clinicName?: string;
  isSuperAdmin: boolean;
  onEdit: (spec: Specialty) => void;
  onDelete: (spec: Specialty) => void;
}

export function SpecialtyRow({ specialty, clinicName, isSuperAdmin, onEdit, onDelete }: SpecialtyRowProps) {
  const theme = useTheme();
  const { t } = useTranslation('specialties');
  const { t: tc } = useTranslation('common');
  const color = getSpecialtyColor(specialty);
  const doctorCount = specialty.doctors?.length ?? 0;

  return (
    <RowCardMotion>
      <Box
        data-testid="specialty-row"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.5, sm: 2 },
          p: 2.5,
          mb: 1.5,
          borderRadius: '14px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          position: 'relative',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: theme.shadows[3],
            transform: 'translateY(-1px)',
            borderColor: theme.palette.primary.light,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 4,
            borderRadius: '0 4px 4px 0',
            backgroundColor: color,
          },
        }}
      >
        {/* Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SpecialtyIcon specialty={specialty} />
        </Box>

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {specialty.name}
            </Typography>
            <DepartmentChip department={specialty.department} color={color} />
            {isSuperAdmin && clinicName && (
              <Box
                data-testid="specialty-clinic"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  height: 24,
                  borderRadius: '8px',
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#e0e7ff'}`,
                  color: theme.palette.mode === 'dark' ? '#a5b4fc' : '#4338ca',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <MedicalServices sx={{ fontSize: 13 }} />
                <span>{clinicName}</span>
              </Box>
            )}
          </Box>
          {specialty.description && (
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {specialty.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <ProcedureBadge procedures={specialty.procedures} />
            {doctorCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DoctorAvatarGroup doctors={specialty.doctors} max={3} />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                  {t('doctorsCount', { count: doctorCount })}
                </Typography>
              </Box>
            )}
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, ml: 'auto', display: { xs: 'none', sm: 'block' } }}
            >
              {formatDate(specialty.created_at)}
            </Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            borderTop: { xs: `1px solid ${theme.palette.divider}`, sm: 'none' },
            pt: { xs: 1, sm: 0 },
          }}
        >
          <Tooltip title={t('editSpecialty')}>
            <IconButton size="small" onClick={() => onEdit(specialty)} data-testid="specialty-edit">
              <Edit sx={{ fontSize: 19, color: theme.palette.text.secondary }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={tc('delete')}>
            <IconButton size="small" onClick={() => onDelete(specialty)} data-testid="specialty-delete">
              <Delete sx={{ fontSize: 19, color: theme.palette.error.main }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </RowCardMotion>
  );
}
