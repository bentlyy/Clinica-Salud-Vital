import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function SuperAdminTenantDetailPage() {
  const { t } = useTranslation();
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
      setError(t('super_admin_tenant_detail.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Cargando detalles..." />;
  if (error) return <ErrorState error={new Error(error)} onRetry={load} />;
  if (!tenant) return <ErrorState error={new Error(t('super_admin_tenant_detail.notFound'))} />;

  const planConfig = TENANT_PLAN_CONFIG[tenant.plan] ?? TENANT_PLAN_CONFIG.free!;

  const stats = [
    { label: t('super_admin_tenant_detail.statUsers'), value: tenant.total_users || 0, icon: <People sx={{ fontSize: 22 }} />, color: '#2563eb' },
    { label: t('super_admin_tenant_detail.statPatients'), value: tenant.total_patients || 0, icon: <People sx={{ fontSize: 22 }} />, color: '#0d9488' },
    { label: t('super_admin_tenant_detail.statDoctors'), value: tenant.total_doctors || 0, icon: <LocalHospital sx={{ fontSize: 22 }} />, color: '#7c3aed' },
    { label: t('super_admin_tenant_detail.statBookings'), value: tenant.total_bookings || 0, icon: <CalendarMonth sx={{ fontSize: 22 }} />, color: '#d97706' },
    { label: t('super_admin_tenant_detail.statInvoices'), value: tenant.invoice_count || 0, icon: <Receipt sx={{ fontSize: 22 }} />, color: '#ec4899' },
    { label: t('super_admin_tenant_detail.statLabRequests'), value: tenant.lab_request_count || 0, icon: <Science sx={{ fontSize: 22 }} />, color: '#f59e0b' },
  ];

  return (
    <Box>
      <PageHeader
        title={tenant.name}
        subtitle={t('super_admin_tenant_detail.subtitle', { slug: tenant.slug })}
        action={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/tenants')} sx={{ textTransform: 'none' }}>
            {t('super_admin_tenant_detail.back')}
          </Button>
        }
      />

      {/* Info */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6b7280', mb: 2, letterSpacing: 1, fontSize: 11 }}>
          {t('super_admin_tenant_detail.infoTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[
            { label: t('super_admin_tenant_detail.labelDomain'), value: tenant.domain || '—' },
            { label: t('super_admin_tenant_detail.labelPlan'), value: <Chip label={planConfig.label} size="small" sx={{ backgroundColor: planConfig.bgColor, color: planConfig.color, fontWeight: 600 }} /> },
            { label: t('super_admin_tenant_detail.labelStatus'), value: <Chip label={tenant.active ? t('super_admin_tenant_detail.statusActive') : t('super_admin_tenant_detail.statusInactive')} size="small" sx={{ backgroundColor: tenant.active ? '#ecfdf5' : '#fef2f2', color: tenant.active ? '#059669' : '#dc2626', fontWeight: 600 }} /> },
            { label: t('super_admin_tenant_detail.labelLocale'), value: tenant.locale || '—' },
            { label: t('super_admin_tenant_detail.labelTimezone'), value: tenant.timezone || '—' },
            { label: t('super_admin_tenant_detail.labelCreated'), value: new Date(tenant.created_at).toLocaleDateString('es-CL') },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>{item.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Stats */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6b7280', mb: 2, letterSpacing: 1, fontSize: 11 }}>
        {t('super_admin_tenant_detail.statsTitle')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s) => (
          <Grid xs={6} sm={4} md={2} key={s.label}>
            <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid #f3f4f6', borderRadius: '12px' }}>
              <Typography sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Revenue placeholder */}
      <Paper sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6b7280', mb: 2, letterSpacing: 1, fontSize: 11 }}>
          {t('super_admin_tenant_detail.financialTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>{t('super_admin_tenant_detail.totalInvoices')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>{tenant.invoice_count || 0}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>{t('super_admin_tenant_detail.confirmedBookings')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>{tenant.confirmed_bookings || 0}</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
