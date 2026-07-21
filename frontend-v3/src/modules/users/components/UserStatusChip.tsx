import { Chip, Tooltip } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';

interface UserStatusChipProps {
  isActive: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium';
}

export function UserStatusChip({ isActive, onClick, size = 'small' }: UserStatusChipProps) {
  return (
    <Tooltip title={isActive ? 'Activo — Haz clic para desactivar' : 'Inactivo — Haz clic para activar'}>
      <Chip
        icon={isActive ? <CheckCircle sx={{ fontSize: 14 }} /> : <Cancel sx={{ fontSize: 14 }} />}
        label={isActive ? 'Activo' : 'Inactivo'}
        size={size}
        onClick={onClick}
        sx={{
          fontWeight: 600,
          borderRadius: '8px',
          cursor: onClick ? 'pointer' : 'default',
          backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
          color: isActive ? '#059669' : '#dc2626',
          border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
          '&:hover': onClick
            ? {
                backgroundColor: isActive ? '#d1fae5' : '#fee2e2',
              }
            : undefined,
          '& .MuiChip-icon': {
            color: isActive ? '#059669' : '#dc2626',
          },
        }}
      />
    </Tooltip>
  );
}
