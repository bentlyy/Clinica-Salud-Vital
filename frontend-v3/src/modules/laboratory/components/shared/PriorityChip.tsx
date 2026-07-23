import { memo } from 'react';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  LAB_PRIORITY_LABELS,
  LAB_PRIORITY_COLORS,
  type LabPriority,
} from '@/modules/laboratory/types/lab.types';

interface PriorityChipProps {
  priority: string;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

const PRIORITY_MUI_COLOR_MAP: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  low: 'default',
  normal: 'info',
  urgent: 'warning',
  emergency: 'error',
};

export const PriorityChip = memo(function PriorityChip({
  priority,
  size = 'small',
  showIcon = false,
}: PriorityChipProps) {
  const theme = useTheme();

  const chipColor = LAB_PRIORITY_COLORS[priority as LabPriority] ?? '#6b7280';
  const displayLabel = LAB_PRIORITY_LABELS[priority as LabPriority] ?? priority;
  const muiColor = PRIORITY_MUI_COLOR_MAP[priority] ?? 'default';
  const isEmergency = priority === 'emergency';

  return (
    <Chip
      icon={
        showIcon && isEmergency ? (
          <WarningAmberIcon sx={{ fontSize: 14 }} />
        ) : undefined
      }
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
