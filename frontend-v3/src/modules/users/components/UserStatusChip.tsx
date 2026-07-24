import { Chip, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';

interface UserStatusChipProps {
  isActive: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium';
}

export function UserStatusChip({ isActive, onClick, size = 'small' }: UserStatusChipProps) {
  const theme = useTheme();

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
          backgroundColor: isActive ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg,
          color: isActive ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text,
          border: `1px solid ${isActive ? theme.palette.custom.status.success.border : theme.palette.custom.status.error.border}`,
          '&:hover': onClick
            ? {
                backgroundColor: isActive ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg,
              }
            : undefined,
          '& .MuiChip-icon': {
            color: isActive ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text,
          },
        }}
      />
    </Tooltip>
  );
}
