import { useNavigate } from 'react-router-dom';
import { IconButton, Badge, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Notifications from '@mui/icons-material/Notifications';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { data } = useNotifications({ page: 1, limit: 1 });
  const count = data?.total ?? 0;

  return (
    <Tooltip title={`Notificaciones (${count})`}>
      <IconButton
        size="small"
        sx={{ color: theme.palette.text.secondary }}
        onClick={() => navigate('/notifications')}
      >
        <Badge
          badgeContent={count}
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: theme.palette.error.main,
              color: theme.palette.common.white,
              fontWeight: 700,
              fontSize: '0.625rem',
              height: 18,
              minWidth: 18,
            },
          }}
        >
          <Notifications fontSize="small" />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
