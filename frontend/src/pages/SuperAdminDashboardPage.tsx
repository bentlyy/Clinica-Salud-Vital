import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { getGlobalStats, getDashboardAnalytics, getTopTenants, getRevenueAnalytics, getGrowthAnalytics } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';

const CHART_COLORS = ['var(--chart-blue)', 'var(--chart-green)', 'var(--chart-yellow)', 'var(--chart-orange)', 'var(--chart-purple)'];
const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ChartCard({ title, children, style }) {
  return (
    <div className="card" style={{ padding: 20, ...style }}>
      <h4 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>{title}</h4>
      {children}
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [topBookings, setTopBookings] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, dashData, topB, topU, revData, growData] = await Promise.all([
          getGlobalStats(),
          getDashboardAnalytics(),
          getTopTenants(8, 'bookings'),
          getTopTenants(8, 'users'),
          getRevenueAnalytics(12),
          getGrowthAnalytics(12),
        ]);
        setStats(statsData);
        setDashboard(dashData.data || dashData);
        setTopBookings(topB.data || []);
        setTopUsers(topU.data || []);
        setRevenue(revData.data || []);
        setGrowth(growData.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
        <p>{t('superadmin.loading_charts')}</p>
      </div>
    );
  }

  const dash = dashboard || {};
  const planDist = dash.planDistribution || [];

  const statCards = [
    { label: t('superadmin.total_tenants'), value: stats?.total_tenants ?? dash.total_tenants ?? 0, color: 'var(--chart-blue)', icon: '🏢' },
    { label: t('superadmin.active'), value: dash.active_tenants ?? stats?.active_tenants ?? 0, color: 'var(--chart-green)', icon: '✅' },
    { label: t('superadmin.users'), value: dash.total_users ?? stats?.total_users ?? 0, color: 'var(--chart-purple)', icon: '👥' },
    { label: t('superadmin.doctors'), value: dash.total_doctors ?? stats?.total_doctors ?? 0, color: 'var(--chart-orange)', icon: '🩺' },
    { label: t('superadmin.bookings'), value: dash.total_bookings ?? stats?.total_bookings ?? 0, color: 'var(--chart-yellow)', icon: '📅' },
    { label: t('superadmin.revenue'), value: `$${Number(dash.total_revenue ?? stats?.total_revenue ?? 0).toLocaleString()}`, color: 'var(--chart-green)', icon: '💰' },
  ];

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div className="page-container-wide" style={{ padding: '32px 24px' }}>
      <div className="page-header-row">
        <div>
          <h1 style={{ margin: 0 }}>{t('superadmin.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{t('superadmin.subtitle')}</p>
        </div>
        <Link to="/super-admin/tenants" className="btn btn--primary">{t('superadmin.manage_tenants')}</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {dash.confirmed_bookings !== undefined && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
          <div className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--chart-green)' }}>{dash.confirmed_bookings}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('superadmin.confirmed_bookings')}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--chart-red)' }}>{dash.cancelled_bookings}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('superadmin.cancelled_bookings')}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--chart-blue)' }}>{dash.active_subscriptions}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('superadmin.active_subscriptions')}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--chart-purple)' }}>${Number(dash.mrr || 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('superadmin.mrr')}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <ChartCard title={t('superadmin.plan_distribution')}>
          {planDist.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width="60%" height={260}>
                <PieChart>
                  <Pie
                    data={planDist}
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="count"
                    nameKey="plan"
                    label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`}
                  >
                    {planDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {planDist.map((p, i) => (
                  <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{p.plan}</span>
                    <strong>{p.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos</p>
          )}
        </ChartCard>

        <ChartCard title={t('superadmin.revenue_trend')}>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(m) => {
                    const parts = m.split('-');
                    return months[parseInt(parts[1]) - 1] || m;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, t('superadmin.revenue_short')]} />
                <Area type="monotone" dataKey="revenue" stroke="var(--chart-green)" fill="var(--chart-green)" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos</p>
          )}
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <ChartCard title={t('superadmin.top_tenants_bookings')}>
          {topBookings.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBookings.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip formatter={(value) => [value, t('superadmin.bookings')]} />
                <Bar dataKey="total_bookings" fill="var(--chart-blue)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos</p>
          )}
        </ChartCard>

        <ChartCard title={t('superadmin.top_tenants_users')}>
          {topUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsers.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip formatter={(value) => [value, t('superadmin.users')]} />
                <Bar dataKey="total_users" fill="var(--chart-purple)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos</p>
          )}
        </ChartCard>
      </div>

      <ChartCard title={t('superadmin.growth_metrics')} style={{ marginBottom: 28 }}>
        {growth.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickFormatter={(m) => {
                  const parts = m.split('-');
                  return months[parseInt(parts[1]) - 1] || m;
                }}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new_tenants" stroke="#0088FE" strokeWidth={2} name={t('superadmin.new_tenants')} dot={false} />
              <Line type="monotone" dataKey="new_users" stroke="#00C49F" strokeWidth={2} name={t('superadmin.new_users')} dot={false} />
              <Line type="monotone" dataKey="new_bookings" stroke="#FFBB28" strokeWidth={2} name={t('superadmin.new_bookings')} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos de crecimiento</p>
        )}
      </ChartCard>

      <div className="card" style={{ padding: 20 }}>
        <h4 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>{t('superadmin.quick_actions')}</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/super-admin/tenants" className="btn btn--primary">{t('superadmin.view_all')}</Link>
          <Link to="/super-admin/tenants?new=1" className="btn btn--outline" onClick={(e) => { e.preventDefault(); window.location.href = '/super-admin/tenants'; }}>{t('superadmin.create_tenant')}</Link>
          <Link to="/super-admin/demo-data" className="btn btn--outline">Demo Data</Link>
          <Link to="/saas/plans" className="btn btn--outline">{t('superadmin.view_plans')}</Link>
        </div>
      </div>
    </div>
  );
}
