import { memo } from 'react';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  LAB_STATUS_LABELS,
  LAB_STATUS_COLORS,
  type LabRequestStatus,
} from '@/modules/laboratory/types/lab.types';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
  label?: string;
}

const STATUS_MUI_COLOR_MAP: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  validated_tech: 'success',
  validated_doctor: 'success',
  signed: 'success',
  delivered: 'success',
  cancelled: 'default',
  rejected: 'error',
  pending: 'warning',
};

export const StatusBadge = memo(function StatusBadge({
  status,
  size = 'small',
  label,
}: StatusBadgeProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const chipColor = LAB_STATUS_COLORS[status as LabRequestStatus] ?? theme.palette.text.secondary;
  const displayLabel =
    label ?? t(`lab:statusLabels.${status}`, LAB_STATUS_LABELS[status as LabRequestStatus] ?? status);
  const muiColor = STATUS_MUI_COLOR_MAP[status] ?? 'default';

  return (
    <Chip
      label={displayLabel}
      size={size}
      variant="outlined"
      color={muiColor}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        borderRadius: '8px',
        borderColor: chipColor,
        color: chipColor,
        backgroundColor: alpha(chipColor, 0.06),
        '& .MuiChip-label': {
          px: size === 'small' ? 1 : 1.5,
        },
      }}
    />
  );
});
