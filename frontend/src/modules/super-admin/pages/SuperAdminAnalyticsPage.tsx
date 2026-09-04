import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { DataTable } from '@/shared/components/ui/DataTable';
import { apiClient } from '@/shared/services/api-client';
import { formatNumber } from '@/shared/utils/localeUtils';

// ── Types ────────────────────────────────────────────────────────────────────

interface RevenueData {
  month: string;
  revenue: number;
}

interface GrowthData {
  month: string;
  new_users: number;
  new_tenants: number;
  new_bookings: number;
}

interface ChurnData {
  mrr: number;
  arr: number;
  churn_rate: number;
  annual_retention: number;
}

interface OperationsData {
  cancellation_rate: number;
  no_show_rate: number;
  avg_lead_days: number;
  total_bookings_period: number;
  specialties: { name: string; total: number }[];
  top_doctors: { name: string; total_bookings: number }[];
  hourly_demand: { hour: string; count: number }[];
}

interface ComparisonData {
  id: string;
  name: string;
  active: boolean;
  total_users: number;
  total_doctors: number;
  total_bookings: number;
  metric_value: number;
  health_score: number;
}

interface OccupancyData {
  tenant_name: string;
  occupancy_rate: number;
}

interface TopTenantData {
  name: string;
  total_bookings: number;
}

type TabKey = 'overview' | 'revenue' | 'growth' | 'operations' | 'comparison';

// ── Helpers ──────────────────────────────────────────────────────────────────

function useMonthLabels(): string[] {
  const { t } = useTranslation('dates');
  return [
    t('january'), t('february'), t('march'), t('april'),
    t('may'), t('june'), t('july'), t('august'),
    t('september'), t('october'), t('november'), t('december'),
  ];
}

function formatMonthFactory(monthLabels: string[]) {
  return function formatMonth(m: string): string {
    if (!m) return m;
    const parts = m.split('-');
    const monthIndex = parseInt(parts[1] ?? '0', 10) - 1;
    return monthLabels[monthIndex] ?? m;
  };
}

function extractList<T>(response: { data?: unknown }): T[] {
  const body = response?.data;
  if (Array.isArray(body) && 'data' in body && Array.isArray((body as { data: unknown }).data)) {
    return (body as { data: T[] }).data;
  }
  if (Array.isArray(body)) return body as T[];
  return [];
}

function extractObject<T>(response: { data?: unknown }): T | null {
  const body = response?.data;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (record.data && typeof record.data === 'object' && !(Array.isArray(record.data))) {
      return record.data as T;
    }
    return body as T;
  }
  return null;
}

// ── Stat card interface ──────────────────────────────────────────────────────

interface KpiStat {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SuperAdminAnalyticsPage() {
  const { t } = useTranslation('super_admin_analytics');
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [churn, setChurn] = useState<ChurnData | null>(null);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyData[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenantData[]>([]);

  const monthLabels = useMonthLabels();
  const formatMonth = useMemo(() => formatMonthFactory(monthLabels), [monthLabels]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        apiClient.get('/super-admin/analytics/revenue', { params: { months: 12 } }),
        apiClient.get('/super-admin/analytics/growth', { params: { months: 12 } }),
        apiClient.get('/super-admin/analytics/churn', { params: { months: 12 } }),
        apiClient.get('/super-admin/analytics/operations', { params: { months: 6 } }),
        apiClient.get('/super-admin/analytics/comparison'),
        apiClient.get('/super-admin/analytics/occupancy'),
        apiClient.get('/super-admin/analytics/top-tenants', { params: { limit: 20, sortBy: 'bookings' } }),
      ]);

      const [revRes, growRes, churnRes, opsRes, compRes, occRes, topRes] = results;

      if (revRes.status === 'fulfilled') setRevenue(extractList<RevenueData>(revRes.value));
      if (growRes.status === 'fulfilled') setGrowth(extractList<GrowthData>(growRes.value));
      if (churnRes.status === 'fulfilled') setChurn(extractObject<ChurnData>(churnRes.value));
      if (opsRes.status === 'fulfilled') setOperations(extractObject<OperationsData>(opsRes.value));
      if (compRes.status === 'fulfilled') setComparison(extractList<ComparisonData>(compRes.value));
      if (occRes.status === 'fulfilled') setOccupancy(extractList<OccupancyData>(occRes.value));
      if (topRes.status === 'fulfilled') setTopTenants(extractList<TopTenantData>(topRes.value));

      setLoading(false);
    };
    void load();
  }, []);

  const d = churn ?? ({} as ChurnData);
  const ops = operations ?? ({} as OperationsData);

  const kpiStats: KpiStat[] = [
    {
      icon: '💰',
      value: `$${formatNumber(Number(d.mrr ?? 0))}`,
      label: t('mrr', 'MRR (Ingresos Mensuales)'),
    },
    {
      icon: '📈',
      value: `$${formatNumber(Number(d.arr ?? 0))}`,
      label: t('arr', 'ARR (Ingresos Anuales)'),
    },
    {
      icon: '📊',
      value: `${String(d.churn_rate ?? 0)}%`,
      label: t('churn_rate', 'Churn mensual'),
      color: (d.churn_rate ?? 0) > 5 ? theme.palette.error.main : theme.palette.success.main,
    },
    {
      icon: '🔄',
      value: `${String(d.annual_retention ?? 0)}%`,
      label: t('retention', 'Retención anual'),
    },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t('tab_overview', 'Resumen') },
    { key: 'revenue', label: t('tab_revenue', 'Ingresos') },
    { key: 'growth', label: t('tab_growth', 'Crecimiento') },
    { key: 'operations', label: t('tab_operations', 'Operación') },
    { key: 'comparison', label: t('tab_comparison', 'Comparación') },
  ];

  if (loading) {
    return <LoadingState message={t('loading', 'Cargando analíticas...')} />;
  }

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('analytics_title', 'Analíticas de la Plataforma')}
        subtitle={t('analytics_subtitle', 'Métricas globales de todas las clínicas')}
      />

      {/* ── KPI Row ──────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpiStats.map((stat) => (
          <Grid key={stat.label} xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>{stat.icon}</Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: stat.color ?? theme.palette.text.primary }}
              >
                {stat.value}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v as TabKey)}
        sx={{
          mb: 3,
          borderBottom: `2px solid ${theme.palette.divider}`,
          '& .MuiTabs-indicator': { backgroundColor: theme.palette.primary.main },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            color: theme.palette.grey[500],
            '&.Mui-selected': { color: theme.palette.text.primary },
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={tab.label} />
        ))}
      </Tabs>

      {/* ── Overview ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <OverviewTab
          revenue={revenue}
          growth={growth}
          topTenants={topTenants}
          formatMonth={formatMonth}
        />
      )}

      {/* ── Revenue ──────────────────────────────────────────────────── */}
      {activeTab === 'revenue' && (
        <RevenueTab
          revenue={revenue}
          churn={d}
          formatMonth={formatMonth}
        />
      )}

      {/* ── Growth ───────────────────────────────────────────────────── */}
      {activeTab === 'growth' && (
        <GrowthTab growth={growth} formatMonth={formatMonth} />
      )}

      {/* ── Operations ───────────────────────────────────────────────── */}
      {activeTab === 'operations' && <OperationsTab operations={ops} />}

      {/* ── Comparison ───────────────────────────────────────────────── */}
      {activeTab === 'comparison' && (
        <ComparisonTab
          comparison={comparison}
          occupancy={occupancy}
        />
      )}
    </MotionDiv>
  );
}

// ── Empty chart message ──────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <Typography sx={{ color: theme.palette.grey[500], textAlign: 'center', py: 5 }}>
      {message}
    </Typography>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  revenue: RevenueData[];
  growth: GrowthData[];
  topTenants: TopTenantData[];
  formatMonth: (m: string) => string;
}

function OverviewTab({ revenue, growth, topTenants, formatMonth }: OverviewTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_analytics');
  return (
    <>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* MRR Evolution */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('revenue_evolution', 'Evolución MRR')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, height: 300 }}>
              {revenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={formatMonth} />
                    <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={(v: number) => `$${String(v)}`} />
                    <Tooltip formatter={(value: number) => [`$${formatNumber(Number(value))}`, t('income_tooltip', 'Ingresos')]} />
                    <Area type="monotone" dataKey="revenue" stroke={theme.palette.success.main} fill={theme.palette.success.main} fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message={t('no_data', 'Sin datos')} />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* User Growth */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('growth_chart', 'Crecimiento de Usuarios')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, height: 300 }}>
              {growth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={formatMonth} />
                    <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <Tooltip />
                    <Bar dataKey="new_users" fill={theme.palette.custom.purple.main} name={t('new_users', 'Nuevos usuarios')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="new_tenants" fill={theme.palette.info.main} name={t('new_tenants', 'Nuevos tenants')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message={t('no_data', 'Sin datos')} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Clinics */}
      <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('top_clinics', 'Top Clínicas por Citas')}
          </Typography>
        </Box>
        <Box sx={{ p: 2, height: 320 }}>
          {topTenants.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTenants.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <Tooltip />
                <Bar dataKey="total_bookings" fill={theme.palette.custom.purple.main} name={t('bookings_header', 'Citas')} radius={[4, 4, 0, 0]}>
                  {topTenants.slice(0, 10).map((_, i) => (
                    <Cell key={`cell-${String(i)}`} fill={`hsl(${200 + i * 15}, 60%, ${55 - i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message={t('no_data', 'Sin datos')} />
          )}
        </Box>
      </Paper>
    </>
  );
}

// ── Revenue Tab ──────────────────────────────────────────────────────────────

interface RevenueTabProps {
  revenue: RevenueData[];
  churn: ChurnData;
  formatMonth: (m: string) => string;
}

function RevenueTab({ revenue, churn, formatMonth }: RevenueTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_analytics');
  const maxRev = Math.max(...revenue.map((r) => r.revenue), 0);
  const barColors = [theme.palette.info.main, '#7c3aed', theme.palette.warning.main];

  return (
    <>
      {/* Revenue Evolution Chart */}
      <Paper sx={{ p: 0, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('revenue_last_12m', 'Evolución de Ingresos — Últimos 12 meses')}
          </Typography>
        </Box>
        <Box sx={{ p: 2, height: 370 }}>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={formatMonth} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={(v: number) => `$${String(v)}`} />
                <Tooltip formatter={(value: number) => [`$${formatNumber(Number(value))}`, t('income_tooltip', 'Ingresos')]} />
                <Area type="monotone" dataKey="revenue" stroke={theme.palette.success.main} fill={theme.palette.success.main} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message={t('no_data_revenue', 'Sin datos de ingresos')} />
          )}
        </Box>
      </Paper>

      {/* Revenue KPIs */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { value: `$${formatNumber(Number(churn.mrr ?? 0))}`, label: t('mrr_current', 'MRR Actual'), textAlign: 'center' as const },
          { value: `$${formatNumber(Number(churn.arr ?? 0))}`, label: t('arr_projected', 'ARR Proyectado'), color: theme.palette.info.main, textAlign: 'center' as const },
          { value: `${String(churn.churn_rate ?? 0)}%`, label: t('churn_rate', 'Churn Rate'), color: (churn.churn_rate ?? 0) > 5 ? theme.palette.error.main : theme.palette.success.main, textAlign: 'center' as const },
          { value: `${String(churn.annual_retention ?? 0)}%`, label: t('retention_annual', 'Retención Anual'), color: theme.palette.custom.purple.main, textAlign: 'center' as const },
        ].map((stat) => (
          <Grid key={stat.label} xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', textAlign: stat.textAlign }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color ?? theme.palette.text.primary }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Bar List */}
      <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('revenue_detail', 'Ingresos por Mes')}
          </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          {revenue.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {revenue.map((rev, i) => {
                const pct = maxRev > 0 ? (rev.revenue / maxRev) * 100 : 0;
                return (
                  <Box key={rev.month}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                        {formatMonth(rev.month)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        ${formatNumber(rev.revenue)}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 8, bgcolor: theme.palette.custom.surface.sunken, borderRadius: 1, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${pct}%`,
                          bgcolor: barColors[i % barColors.length],
                          borderRadius: 1,
                          transition: 'width 0.5s',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <EmptyChart message={t('no_data', 'Sin datos')} />
          )}
        </Box>
      </Paper>
    </>
  );
}

// ── Growth Tab ───────────────────────────────────────────────────────────────

interface GrowthTabProps {
  growth: GrowthData[];
  formatMonth: (m: string) => string;
}

function GrowthTab({ growth, formatMonth }: GrowthTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_analytics');
  const last = growth.length > 0 ? growth[growth.length - 1] : null;

  return (
    <>
      {/* Growth Chart */}
      <Paper sx={{ p: 0, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('growth_detail', 'Crecimiento Mensual')}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {t('growth_subtitle', 'Nuevos tenants, usuarios y reservas')}
          </Typography>
        </Box>
        <Box sx={{ p: 2, height: 370 }}>
          {growth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={formatMonth} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="new_tenants" fill={theme.palette.info.main} name={t('new_tenants', 'Nuevos tenants')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="new_users" fill={theme.palette.custom.purple.main} name={t('new_users', 'Nuevos usuarios')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="new_bookings" fill={theme.palette.success.main} name={t('new_bookings', 'Nuevas reservas')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message={t('no_data_growth', 'Sin datos de crecimiento')} />
          )}
        </Box>
      </Paper>

      {/* Growth KPIs */}
      {last && (
        <Grid container spacing={2}>
          {[
            { value: last.new_tenants ?? 0, label: t('new_tenants_current', 'Nuevos tenants (mes actual)') },
            { value: last.new_users ?? 0, label: t('new_users_current', 'Nuevos usuarios (mes actual)') },
            { value: last.new_bookings ?? 0, label: t('new_bookings_current', 'Nuevas reservas (mes actual)') },
            {
              value: growth.reduce((sum, g) => sum + Number(g.new_tenants ?? 0), 0),
              label: t('total_tenants_12m', 'Total tenants (12 meses)'),
            },
          ].map((stat) => (
            <Grid key={stat.label} xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {stat.value}
                </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}

// ── Operations Tab ───────────────────────────────────────────────────────────

interface OperationsTabProps {
  operations: OperationsData;
}

function OperationsTab({ operations }: OperationsTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_analytics');
  return (
    <>
      {/* Operations KPIs */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { value: `${String(operations.cancellation_rate ?? 0)}%`, label: t('cancellation_rate', 'Tasa cancelación'), color: theme.palette.success.main },
          { value: `${String(operations.no_show_rate ?? 0)}%`, label: t('no_show_rate', 'No-show rate'), color: theme.palette.custom.purple.main },
          { value: String(operations.avg_lead_days ?? 0), label: t('lead_days', 'Días prom. reserva→atención'), color: theme.palette.info.main },
          { value: String(operations.total_bookings_period ?? 0), label: t('total_bookings_6m', 'Citas (últimos 6m)'), color: theme.palette.warning.main },
        ].map((stat) => (
          <Grid key={stat.label} xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Specialties & Top Doctors */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Specialties */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('specialties_used', 'Especialidades más usadas')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, height: 320 }}>
              {operations.specialties && operations.specialties.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operations.specialties.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <Tooltip />
                    <Bar dataKey="total" fill={theme.palette.info.main} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message={t('no_data', 'Sin datos')} />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Top Doctors */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('top_doctors', 'Top 10 Médicos por citas')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, height: 320 }}>
              {operations.top_doctors && operations.top_doctors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operations.top_doctors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                    <Tooltip />
                    <Bar dataKey="total_bookings" fill={theme.palette.custom.purple.main} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message={t('no_data', 'Sin datos')} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Hourly Demand */}
      {operations.hourly_demand && operations.hourly_demand.length > 0 && (
        <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {t('hourly_demand', 'Demanda por Hora del Día')}
            </Typography>
          </Box>
          <Box sx={{ p: 2, height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operations.hourly_demand}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <Tooltip />
                <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}
    </>
  );
}

// ── Comparison Tab ───────────────────────────────────────────────────────────

interface ComparisonTabProps {
  comparison: ComparisonData[];
  occupancy: OccupancyData[];
}

function ComparisonTab({ comparison, occupancy }: ComparisonTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_analytics');
  const getScoreColor = (score: number): string => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 50) return theme.palette.warning.main;
    if (score >= 20) return theme.palette.custom.orange.main;
    return theme.palette.error.main;
  };

  return (
    <>
      {/* Occupancy Chart */}
      {occupancy.length > 0 && (
        <Paper sx={{ p: 0, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('occupancy_chart', 'Ocupación de Doctores por Clínica')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancy}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="tenant_name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} tickFormatter={(v: number) => `${String(v)}%`} />
                  <Tooltip formatter={(value: number) => [`${Number(value).toFixed(1)}%`, t('occupancy', 'Ocupación')]} />
                  <Bar dataKey="occupancy_rate" name={t('occupancy_name', 'Tasa de ocupación')} radius={[4, 4, 0, 0]}>
                  {occupancy.map((entry, i) => (
                    <Cell
                      key={`occ-${String(i)}`}
                      fill={
                        Number(entry.occupancy_rate) > 80
                          ? theme.palette.success.main
                          : Number(entry.occupancy_rate) > 50
                            ? theme.palette.warning.main
                            : theme.palette.error.main
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Comparison Table */}
      <Paper sx={{ p: 0, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('comparison_table', 'Comparativa Completa de Clínicas')}
          </Typography>
        </Box>
        {comparison.length > 0 ? (
          <DataTable
            columns={[
              {
                key: 'name',
                header: t('clinic', 'Clínica'),
                render: (row) => {
                  const initials = (row.name ?? '')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: theme.palette.primary.main,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                          {row.name}
                        </Typography>
                        {!row.active && (
                          <Typography variant="caption" sx={{ color: theme.palette.error.main }}>
                            {t('inactive_label', '(inactiva)')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                },
              },
              { key: 'total_users', header: t('users_header', 'Usuarios'), render: (row) => row.total_users ?? 0 },
              { key: 'total_doctors', header: t('doctors_header', 'Doctores'), render: (row) => row.total_doctors ?? 0 },
              { key: 'total_bookings', header: t('bookings_header', 'Citas'), render: (row) => row.total_bookings ?? 0 },
              {
                key: 'metric_value',
                header: t('revenue_header', 'Ingresos'),
                render: (row) => `$${formatNumber(Number(row.metric_value ?? 0))}`,
              },
              {
                key: 'health_score',
                header: t('health_score', 'Salud'),
                render: (row) => {
                  const score = Number(row.health_score ?? 0);
                  return (
                    <Typography sx={{ fontWeight: 700, color: getScoreColor(score) }}>
                      {score}
                    </Typography>
                  );
                },
              },
            ]}
            data={comparison}
            keyExtractor={(row) => row.id}
            rowsPerPage={Math.max(comparison.length, 1)}
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <EmptyChart message={t('no_data_comparison', 'Sin datos de comparación')} />
          </Box>
        )}
      </Paper>
    </>
  );
}
