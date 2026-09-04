import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ArrowBack from '@mui/icons-material/ArrowBack';
import People from '@mui/icons-material/People';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import LocalHospital from '@mui/icons-material/LocalHospital';
import Science from '@mui/icons-material/Science';
import Receipt from '@mui/icons-material/Receipt';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { superAdminService } from '../services/super-admin.service';
import { TENANT_PLAN_CONFIG } from '../types/super-admin.types';
import type { TenantDetail } from '../types/super-admin.types';
import { formatDate } from '@/shared/utils/localeUtils';

export default function SuperAdminTenantDetailPage() {
  const { t } = useTranslation('super_admin_tenant_detail');
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await superAdminService.getTenantById(id);
      setTenant(data);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Cargando detalles..." />;
  if (error) return <ErrorState error={new Error(error)} onRetry={load} />;
  if (!tenant) return <ErrorState error={new Error(t('notFound'))} />;

  const planConfig = TENANT_PLAN_CONFIG[tenant.plan] ?? TENANT_PLAN_CONFIG.free!;

  const stats = [
    { label: t('statUsers'), value: tenant.total_users || 0, icon: <People sx={{ fontSize: 22 }} />, color: theme.palette.info.main },
    { label: t('statPatients'), value: tenant.total_patients || 0, icon: <People sx={{ fontSize: 22 }} />, color: theme.palette.primary.main },
    { label: t('statDoctors'), value: tenant.total_doctors || 0, icon: <LocalHospital sx={{ fontSize: 22 }} />, color: theme.palette.custom.purple.main },
    { label: t('statBookings'), value: tenant.total_bookings || 0, icon: <CalendarMonth sx={{ fontSize: 22 }} />, color: theme.palette.warning.main },
    { label: t('statInvoices'), value: tenant.invoice_count || 0, icon: <Receipt sx={{ fontSize: 22 }} />, color: theme.palette.custom.pink.main },
    { label: t('statLabRequests'), value: tenant.lab_request_count || 0, icon: <Science sx={{ fontSize: 22 }} />, color: theme.palette.warning.main },
  ];

  return (
    <Box>
      <PageHeader
        title={tenant.name}
        subtitle={t('subtitle', { slug: tenant.slug })}
        action={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/tenants')} sx={{ textTransform: 'none' }}>
            {t('back')}
          </Button>
        }
      />

      {/* Info */}
      <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 2, letterSpacing: 1, fontSize: 11 }}>
          {t('infoTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[
            { label: t('labelDomain'), value: tenant.domain || '—' },
            { label: t('labelPlan'), value: <Chip label={planConfig.label} size="small" sx={{ backgroundColor: planConfig.bgColor, color: planConfig.color, fontWeight: 600 }} /> },
            { label: t('labelStatus'), value: <Chip label={tenant.active ? t('statusActive') : t('statusInactive')} size="small" sx={{ backgroundColor: tenant.active ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg, color: tenant.active ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text, fontWeight: 600 }} /> },
            { label: t('labelLocale'), value: tenant.locale || '—' },
            { label: t('labelTimezone'), value: tenant.timezone || '—' },
            { label: t('labelCreated'), value: formatDate(tenant.created_at) },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{item.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Stats */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 2, letterSpacing: 1, fontSize: 11 }}>
        {t('statsTitle')}
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((s) => (
          <Grid xs={6} sm={4} md={2} key={s.label}>
            <Paper sx={{ p: 2, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
              <Typography sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Revenue placeholder */}
      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 2, letterSpacing: 1, fontSize: 11 }}>
          {t('financialTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('totalInvoices')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>{tenant.invoice_count || 0}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('confirmedBookings')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>{tenant.confirmed_bookings || 0}</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
