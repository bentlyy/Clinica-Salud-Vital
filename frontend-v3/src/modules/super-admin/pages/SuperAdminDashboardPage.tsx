import { Box, Paper, Typography, Grid, Avatar, Chip } from '@mui/material';
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

const PLAN_COLORS = ['#6b7280', '#2563eb', '#0d9488', '#7c3aed'];

const statCards = (dashboard: { total_tenants: number; active_tenants: number; total_users: number; total_revenue: number }) => [
  {
    label: 'Total Clínicas',
    value: dashboard.total_tenants.toString(),
    icon: <AccountBalance />,
    color: '#0d9488',
    bgColor: '#f0fdfa',
  },
  {
    label: 'Clínicas Activas',
    value: dashboard.active_tenants.toString(),
    icon: <TrendingUp />,
    color: '#059669',
    bgColor: '#ecfdf5',
  },
  {
    label: 'Total Usuarios',
    value: dashboard.total_users.toString(),
    icon: <People />,
    color: '#2563eb',
    bgColor: '#eff6ff',
  },
  {
    label: 'Ingresos Totales',
    value: `$${dashboard.total_revenue.toLocaleString('es-CL')}`,
    icon: <AttachMoney />,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
  },
];

export default function SuperAdminDashboardPage() {
  const { data: dashboard, isLoading, error, refetch } = useSuperAdminDashboard();

  if (isLoading) return <LoadingState message="Cargando panel de administración..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;
  if (!dashboard) return null;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title="Panel de Super Admin"
        subtitle="Vista general de la plataforma SaaS"
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards(dashboard).map((stat) => (
          <Grid xs={12} sm={6} md={3} key={stat.label}>
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
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {stat.label}
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
              Clínicas por Plan
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
              Crecimiento Mensual
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.growth_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#6b7280' }} />
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
                    name="Clínicas"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ fill: '#0d9488', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Ingresos ($)"
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
