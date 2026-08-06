import { Box, Typography, Button, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import HourglassBottomOutlined from '@mui/icons-material/HourglassBottomOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import MedicalServicesOutlined from '@mui/icons-material/MedicalServicesOutlined';
import type { SaasAlert } from '../types/super-admin.types';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2' },
  high: { color: '#ea580c', bg: '#fff7ed' },
  medium: { color: '#f59e0b', bg: '#fffbeb' },
  low: { color: '#64748b', bg: '#f8fafc' },
};

const DEFAULT_SEVERITY = { color: '#64748b', bg: '#f8fafc' };

function alertIcon(type: string) {
  switch (type) {
    case 'inactivity':
      return <ScheduleOutlined sx={{ fontSize: 18 }} />;
    case 'possible_churn':
      return <WarningAmberOutlined sx={{ fontSize: 18 }} />;
    case 'over_plan':
      return <Inventory2Outlined sx={{ fontSize: 18 }} />;
    case 'trial_expiring':
      return <HourglassBottomOutlined sx={{ fontSize: 18 }} />;
    case 'payment_overdue':
      return <PaymentsOutlined sx={{ fontSize: 18 }} />;
    default:
      return <MedicalServicesOutlined sx={{ fontSize: 18 }} />;
  }
}

export function AlertCard({ alert }: { alert: SaasAlert }) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_dashboard');
  const severity = SEVERITY_CONFIG[alert.severity] ?? DEFAULT_SEVERITY;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        '&:hover': { borderColor: severity.color },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          backgroundColor: severity.bg,
          color: severity.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {alertIcon(alert.type)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
          {alert.tenant_name}
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
          {alert.message}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Chip
          size="small"
          label={t(`severity_${alert.severity}`)}
          sx={{
            fontWeight: 600,
            height: 22,
            fontSize: '0.6875rem',
            backgroundColor: severity.bg,
            color: severity.color,
          }}
        />
        <Button
          component={Link}
          to={`/tenants/${alert.tenant_id}`}
          size="small"
          variant="outlined"
          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.5, minWidth: 0 }}
        >
          {t('view_clinic')}
        </Button>
      </Box>
    </Box>
  );
}
