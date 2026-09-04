import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import Search from '@mui/icons-material/Search';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Paid from '@mui/icons-material/Paid';
import Pending from '@mui/icons-material/Pending';
import WarningAmber from '@mui/icons-material/WarningAmber';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { DataTable } from '@/shared/components/ui/DataTable';
import { superAdminService } from '../services/super-admin.service';
import { formatCurrency, formatNumber } from '@/shared/utils/localeUtils';

interface BillingRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  invoice_count: number;
  total_billed: number;
  total_paid: number;
  total_pending: number;
  overdue_count: number;
}

export default function SuperAdminBillingPage() {
  const { t } = useTranslation('super_admin_billing');
  const theme = useTheme();

  const [rows, setRows] = useState<BillingRow[]>([]);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    superAdminService
      .listTenants({ page: 1, limit: 200 })
      .then((res) => {
        if (active) setClinics(res.data.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await superAdminService.getBillingSummary({
        search: search || undefined,
        tenantId: clinicFilter || undefined,
      });
      setRows(result.data || []);
    } catch {
      setRows([]);
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [search, clinicFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && rows.length === 0) return <LoadingState message={t('loading')} />;
  if (error && rows.length === 0) return <ErrorState error={new Error(error)} onRetry={load} />;

  const totals = rows.reduce(
    (acc, row) => ({
      billed: acc.billed + (Number(row.total_billed) || 0),
      paid: acc.paid + (Number(row.total_paid) || 0),
      pending: acc.pending + (Number(row.total_pending) || 0),
      overdue: acc.overdue + (Number(row.overdue_count) || 0),
    }),
    { billed: 0, paid: 0, pending: 0, overdue: 0 },
  );

  const statCards = [
    { label: t('totalBilled'), value: formatCurrency(totals.billed, 'USD'), icon: <AccountBalance />, color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg },
    { label: t('totalPaid'), value: formatCurrency(totals.paid, 'USD'), icon: <Paid />, color: theme.palette.success.main, bgColor: theme.palette.custom.status.success.bg },
    { label: t('totalPending'), value: formatCurrency(totals.pending, 'USD'), icon: <Pending />, color: theme.palette.warning.main, bgColor: theme.palette.custom.status.warning.bg },
    { label: t('overdueInvoices'), value: formatNumber(totals.overdue), icon: <WarningAmber />, color: theme.palette.error.main, bgColor: theme.palette.custom.status.error.bg },
  ];

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid xs={12} sm={6} md={3} key={stat.label}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '14px',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar sx={{ width: 48, height: 48, backgroundColor: stat.bgColor, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            sx={{ flex: { xs: '1 1 100%', md: 1 }, minWidth: { xs: '100%', md: 200 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.grey[500], fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>{t('clinicFilter')}</InputLabel>
            <Select
              value={clinicFilter}
              label={t('clinicFilter')}
              onChange={(e) => setClinicFilter(e.target.value)}
            >
              <MenuItem value="">{t('allClinics')}</MenuItem>
              {clinics.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {rows.length === 0 ? (
        <EmptyState title={t('emptyTitle')} message={t('emptyMessage')} />
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: t('colClinic'),
              render: (row) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      backgroundColor: row.active ? theme.palette.primary.main : theme.palette.grey[400],
                      fontSize: '0.8rem',
                    }}
                  >
                    {row.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {row.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace' }}>
                      {row.slug}
                    </Typography>
                  </Box>
                </Box>
              ),
            },
            {
              key: 'invoice_count',
              header: t('colInvoices'),
              render: (row) => (
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {formatNumber(row.invoice_count)}
                </Typography>
              ),
            },
            {
              key: 'billed',
              header: t('colBilled'),
              render: (row) => (
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {formatCurrency(Number(row.total_billed) || 0, 'USD')}
                </Typography>
              ),
            },
            {
              key: 'paid',
              header: t('colPaid'),
              render: (row) => {
                const paid = Number(row.total_paid) || 0;
                const billed = Number(row.total_billed) || 0;
                const collectionRate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
                return (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                      {formatCurrency(paid, 'USD')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {collectionRate}%
                    </Typography>
                  </>
                );
              },
            },
            {
              key: 'pending',
              header: t('colPending'),
              render: (row) => (
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                  {formatCurrency(Number(row.total_pending) || 0, 'USD')}
                </Typography>
              ),
            },
            {
              key: 'overdue_count',
              header: t('colOverdue'),
              render: (row) =>
                row.overdue_count > 0 ? (
                  <Chip
                    label={formatNumber(row.overdue_count)}
                    size="small"
                    sx={{ backgroundColor: theme.palette.custom.status.error.bg, color: theme.palette.custom.status.error.text, fontWeight: 600 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>0</Typography>
                ),
            },
            {
              key: 'status',
              header: t('colStatus'),
              render: (row) => (
                <Chip
                  label={row.active ? t('active') : t('inactive')}
                  size="small"
                  sx={{
                    backgroundColor: row.active ? theme.palette.custom.status.success.bg : theme.palette.custom.surface.sunken,
                    color: row.active ? theme.palette.custom.status.success.text : theme.palette.text.secondary,
                    fontWeight: 600,
                  }}
                />
              ),
            },
          ]}
          data={rows}
          keyExtractor={(row) => row.id}
          rowsPerPage={Math.max(rows.length, 1)}
        />
      )}
    </MotionDiv>
  );
}
