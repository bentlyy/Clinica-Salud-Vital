import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import { UserAvatar, RoleBadge, StatusBadge, UserRowCardMotion } from './UserVisuals';
import type { User } from '../types/user.types';

interface UserRowProps {
  user: User;
  canToggle: boolean;
  canView: boolean;
  onView: (user: User) => void;
  onToggle: (user: User) => void;
  isToggling?: boolean;
}

function lastAccessLabel(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!iso) return t('never');
  const date = new Date(iso);
  if (isNaN(date.getTime())) return t('never');
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('time_just_now');
  if (minutes < 60) return t('time_minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time_hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time_days', { count: days });
}

export function UserRow({ user, canToggle, canView, onView, onToggle, isToggling }: UserRowProps) {
  const theme = useTheme();
  const { t } = useTranslation('users');

  const contactParts = [
    user.email,
    user.phone,
    user.rut,
  ].filter(Boolean);

  return (
    <UserRowCardMotion>
      <Box
        role="listitem"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.5, sm: 2 },
          p: 2,
          mb: 1.5,
          borderRadius: '14px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: theme.shadows[3],
            transform: 'translateY(-1px)',
            borderColor: `${theme.palette.primary.main}33`,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
          <UserAvatar name={user.name} role={user.role} src={user.avatar_url} />
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, color: theme.palette.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {user.name}
              </Typography>
              <RoleBadge role={user.role} />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: '100%', md: 380 },
              }}
            >
              {contactParts.join(' · ') || '—'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StatusBadge
            isActive={user.is_active}
            onClick={canToggle ? () => onToggle(user) : undefined}
          />
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, display: { xs: 'none', md: 'block' } }}
          >
            {t('last_access', { time: lastAccessLabel(user.created_at, t) })}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            borderTop: { xs: `1px solid ${theme.palette.divider}`, sm: 'none' },
            pt: { xs: 1, sm: 0 },
          }}
        >
          {canView && (
            <Tooltip title={t('view_detail')}>
              <IconButton size="small" onClick={() => onView(user)} aria-label={`${t('view_detail')} ${user.name}`}>
                <VisibilityOutlined sx={{ fontSize: 19, color: theme.palette.text.secondary }} />
              </IconButton>
            </Tooltip>
          )}
          {canToggle && (
            <Tooltip title={user.is_active ? t('deactivate') : t('activate')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onToggle(user)}
                  disabled={isToggling}
                  aria-label={user.is_active ? t('deactivate') : t('activate')}
                  sx={{
                    color: user.is_active ? theme.palette.custom.status.error.text : theme.palette.success.main,
                  }}
                >
                  {user.is_active ? (
                    <BlockOutlined sx={{ fontSize: 19 }} />
                  ) : (
                    <CheckCircleOutline sx={{ fontSize: 19 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </UserRowCardMotion>
  );
}
