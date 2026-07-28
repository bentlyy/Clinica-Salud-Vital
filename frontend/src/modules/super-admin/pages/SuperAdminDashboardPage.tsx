import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography, Avatar, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import TrendingUp from '@mui/icons-material/TrendingUp';
import AccountBalance from '@mui/icons-material/AccountBalance';
import People from '@mui/icons-material/People';
import AttachMoney from '@mui/icons-material/AttachMoney';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useSuperAdminDashboard } from '../hooks/useSuperAdmin';
import { formatNumber } from '@/shared/utils/localeUtils';

export default function SuperAdminDashboardPage() {
  const { t } = useTranslation('super_admin_dashboard');
  const theme = useTheme();
  const { data: dashboard, isLoading, error, refetch } = useSuperAdminDashboard();

  const PLAN_COLORS = [
    theme.palette.text.secondary,
    theme.palette.info.main,
    theme.palette.primary.main,
    '#7c3aed',
  ];

  const statCardConfigs = [
    { key: 'total_clinics', icon: <AccountBalance />, color: theme.palette.primary.main, bgColor: '#f0fdfa', getValue: (d: { total_tenants: number }) => d.total_tenants.toString() },
    { key: 'active_clinics', icon: <TrendingUp />, color: theme.palette.success.main, bgColor: '#ecfdf5', getValue: (d: { active_tenants: number }) => d.active_tenants.toString() },
    { key: 'total_users', icon: <People />, color: theme.palette.info.main, bgColor: '#eff6ff', getValue: (d: { total_users: number }) => d.total_users.toString() },
    { key: 'total_revenue', icon: <AttachMoney />, color: '#7c3aed', bgColor: '#f5f3ff', getValue: (d: { total_revenue: number }) => `$${formatNumber(d.total_revenue)}` },
  ];

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;
  if (!dashboard) return null;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCardConfigs.map((stat) => (
          <Grid xs={12} sm={6} md={3} key={stat.key}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  backgroundColor: stat.bgColor,
                  color: stat.color,
                }}
              >
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {stat.getValue(dashboard)}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {t(stat.key)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        {/* Pie Chart - Tenants by Plan */}
        <Grid xs={12} md={5}>
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
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
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {dashboard.tenants_by_plan.map((item: { plan: string; count: number }, index: number) => (
                <Chip
                  key={item.plan}
                  label={`${item.plan}: ${item.count}`}
                  size="small"
                  sx={{
                    backgroundColor: `${PLAN_COLORS[index % PLAN_COLORS.length]}15`,
                    color: PLAN_COLORS[index % PLAN_COLORS.length],
                    fontWeight: 600,
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Line Chart - Growth */}
        <Grid xs={12} md={7}>
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              {t('monthly_growth')}
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.growth_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
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
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ fill: '#7c3aed', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </MotionDiv>
  );
}
