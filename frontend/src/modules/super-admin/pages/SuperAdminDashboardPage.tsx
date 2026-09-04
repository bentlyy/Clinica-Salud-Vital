import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import TrendingUp from '@mui/icons-material/TrendingUp';
import AccountBalance from '@mui/icons-material/AccountBalance';
import People from '@mui/icons-material/People';
import AttachMoney from '@mui/icons-material/AttachMoney';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useSuperAdminDashboard, useHealthScores, useAlerts } from '../hooks/useSuperAdmin';
import { DashboardKpiCard } from '../components/DashboardKpiCard';
import { HealthScoreGauge } from '../components/HealthScoreGauge';
import { AlertCard } from '../components/AlertCard';
import { formatNumber } from '@/shared/utils/localeUtils';

function computeTrend(months: { tenants: number }[]): { value: number; up: boolean } | null {
  if (months.length < 2) return null;
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  if (!lastMonth || !prevMonth) return null;
  const last = lastMonth.tenants;
  const prev = prevMonth.tenants;
  if (prev === 0) return last > 0 ? { value: 100, up: true } : null;
  const diff = Math.round(((last - prev) / prev) * 100);
  return { value: Math.abs(diff), up: diff >= 0 };
}

export default function SuperAdminDashboardPage() {
  const { t } = useTranslation('super_admin_dashboard');
  const theme = useTheme();
  const { data: dashboard, isLoading, error, refetch } = useSuperAdminDashboard();
  const { data: healthScores = [] } = useHealthScores();
  const { data: alerts = [] } = useAlerts();

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;
  if (!dashboard) return null;

  const PLAN_COLORS = [
    theme.palette.text.secondary,
    theme.palette.info.main,
    theme.palette.primary.main,
    theme.palette.custom.purple.main,
  ];

  const trend = computeTrend(dashboard.growth_by_month);
  const sparkData = dashboard.growth_by_month.map((m) => ({ v: m.tenants }));
  const lastMonth = dashboard.growth_by_month[dashboard.growth_by_month.length - 1];

  const statCardConfigs = [
    {
      key: 'total_clinics',
      icon: <AccountBalance sx={{ fontSize: 20 }} />,
      color: theme.palette.primary.main,
      bgColor: theme.palette.custom.brand.lightest,
      value: dashboard.total_tenants.toString(),
      trend: trend,
    },
    {
      key: 'active_clinics',
      icon: <TrendingUp sx={{ fontSize: 20 }} />,
      color: theme.palette.success.main,
      bgColor: theme.palette.custom.status.success.bg,
      value: dashboard.active_tenants.toString(),
      trend: null,
    },
    {
      key: 'total_users',
      icon: <People sx={{ fontSize: 20 }} />,
      color: theme.palette.info.main,
      bgColor: theme.palette.custom.status.info.bg,
      value: formatNumber(dashboard.total_users),
      trend: null,
    },
    {
      key: 'total_revenue',
      icon: <AttachMoney sx={{ fontSize: 20 }} />,
      color: theme.palette.custom.purple.main,
      bgColor: theme.palette.custom.purple.bg,
      value: `$${formatNumber(dashboard.total_revenue)}`,
      trend: null,
    },
  ];

  const worstHealth = [...healthScores]
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 3);

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCardConfigs.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.key}>
            <DashboardKpiCard
              label={t(stat.key)}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              sparkData={sparkData}
              trend={stat.trend}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              {t('clinics_by_plan')}
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard.tenants_by_plan}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="plan"
                  >
                    {dashboard.tenants_by_plan.map((_: { plan: string; count: number }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PLAN_COLORS[index % PLAN_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {dashboard.tenants_by_plan.map((item: { plan: string; count: number }, index: number) => (
                <Box
                  key={item.plan}
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: `${PLAN_COLORS[index % PLAN_COLORS.length]}15`,
                    color: PLAN_COLORS[index % PLAN_COLORS.length],
                  }}
                >
                  {item.plan}: {item.count}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              {t('monthly_growth')}
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.growth_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="tenants"
                    name={t('clinics_label')}
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={{ fill: theme.palette.primary.main, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name={t('revenue_label')}
                    stroke={theme.palette.custom.purple.main}
                    strokeWidth={2}
                    dot={{ fill: theme.palette.custom.purple.main, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            {lastMonth && (
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mt: 1 }}>
                {t('last_month', { month: lastMonth.month, count: lastMonth.tenants })}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Health + Alerts Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              {t('health_score_title')}
            </Typography>
            {worstHealth.length === 0 ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('health_empty')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {worstHealth.map((tenant) => (
                  <HealthScoreGauge key={tenant.id} tenant={tenant} />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <NotificationsNone sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('alerts_title')}
              </Typography>
            </Box>
            {alerts.length === 0 ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('alerts_empty')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {alerts.slice(0, 6).map((alert) => (
                  <AlertCard key={`${alert.tenant_id}-${alert.type}`} alert={alert} />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </MotionDiv>
  );
}
