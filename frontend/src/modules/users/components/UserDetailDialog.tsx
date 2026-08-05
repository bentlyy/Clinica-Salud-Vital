import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import { UserAvatar, RoleBadge, StatusBadge } from './UserVisuals';
import type { User } from '../types/user.types';
import { formatDate } from '@/shared/utils/localeUtils';

interface UserDetailDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '10px',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff',
          color: theme.palette.secondary.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.primary, fontWeight: 500, overflowWrap: 'anywhere' }}
        >
          {value || '—'}
        </Typography>
      </Box>
    </Box>
  );
}

export function UserDetailDialog({ user, open, onClose }: UserDetailDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {user && <UserAvatar name={user.name} role={user.role} src={user.avatar_url} size={48} />}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {user?.name}
            </Typography>
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <RoleBadge role={user.role} />
                <StatusBadge isActive={user?.is_active ?? false} />
              </Box>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {user && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DetailRow icon={<EmailOutlined sx={{ fontSize: 16 }} />} label={tc('email')} value={user.email} />
              <DetailRow icon={<PhoneOutlined sx={{ fontSize: 16 }} />} label={t('phone_optional')} value={user.phone} />
              <DetailRow icon={<BadgeOutlined sx={{ fontSize: 16 }} />} label="RUT" value={user.rut} />
              <DetailRow
                icon={<CalendarTodayOutlined sx={{ fontSize: 16 }} />}
                label={t('createdAt')}
                value={formatDate(user.created_at)}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Alert severity="info" sx={{ borderRadius: '10px' }}>
              <Typography variant="body2">{t('edit_limitation')}</Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          {tc('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
