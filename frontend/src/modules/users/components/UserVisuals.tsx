import { Box, Avatar, Chip, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getRoleLabel, getRoleColor } from '@/shared/utils/role.utils';
import type { UserRole } from '../types/user.types';

export function getInitials(name: string) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserAvatar({
  name,
  role,
  src,
  size = 40,
}: {
  name: string;
  role: UserRole;
  src?: string;
  size?: number;
}) {
  const theme = useTheme();
  const color = getRoleColor(role);

  return (
    <Tooltip title={`${name || ''} · ${getRoleLabel(role)}`}>
      <Avatar
        src={src}
        sx={{
          width: size,
          height: size,
          backgroundColor: `${color}1A`,
          color,
          fontWeight: 700,
          fontSize: size * 0.36,
          border: `2px solid ${color}55`,
          boxShadow: `0 0 0 3px ${color}12`,
          flexShrink: 0,
        }}
      >
        {getInitials(name) || '?'}
      </Avatar>
    </Tooltip>
  );
}

export function RoleBadge({ role, size = 'small' }: { role: UserRole; size?: 'small' | 'medium' }) {
  const theme = useTheme();
  const color = getRoleColor(role);
  const isDark = theme.palette.mode === 'dark';

  return (
    <Chip
      size={size}
      label={getRoleLabel(role)}
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        height: size === 'small' ? 24 : 28,
        borderRadius: '8px',
        backgroundColor: isDark ? `${color}26` : `${color}12`,
        color,
        border: `1px solid ${isDark ? `${color}59` : `${color}2E`}`,
        '& .MuiChip-label': { pl: 1 },
      }}
      icon={
        <Box
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            ml: '6px',
            flexShrink: 0,
          }}
        />
      }
    />
  );
}

export function StatusBadge({
  isActive,
  onClick,
  size = 'small',
}: {
  isActive: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium';
}) {
  const theme = useTheme();
  const { t } = useTranslation('users');
  const palette = isActive
    ? theme.palette.custom.status.success
    : theme.palette.custom.status.error;

  return (
    <Tooltip title={isActive ? t('status_active_hint') : t('status_inactive_hint')}>
      <Chip
        size={size}
        onClick={onClick}
        label={isActive ? t('status_active') : t('status_inactive')}
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          height: size === 'small' ? 24 : 28,
          borderRadius: '8px',
          cursor: onClick ? 'pointer' : 'default',
          backgroundColor: palette.bg,
          color: palette.text,
          border: `1px solid ${palette.border}`,
          '& .MuiChip-label': { pl: 1 },
          '&:hover': onClick
            ? {
                backgroundColor: palette.bg,
                filter: 'brightness(0.97)',
              }
            : undefined,
        }}
        icon={
          <Box
            component="span"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              ml: '6px',
              flexShrink: 0,
              backgroundColor: isActive ? palette.text : theme.palette.divider,
            }}
          />
        }
      />
    </Tooltip>
  );
}

export function UserRowCardMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
