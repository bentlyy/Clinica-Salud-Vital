import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGlobalStats } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';

export default function SuperAdminDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getGlobalStats();
        setStats(data);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('superadmin.title')}...</div>;

  const cards = [
    { label: t('superadmin.total_tenants'), value: stats?.total_tenants || 0, color: 'var(--primary-500)' },
    { label: t('superadmin.active'), value: stats?.active_tenants || 0, color: 'var(--success)' },
    { label: t('superadmin.users'), value: stats?.total_users || 0, color: 'var(--accent-500)' },
    { label: t('superadmin.doctors'), value: stats?.total_doctors || 0, color: 'var(--info)' },
    { label: t('superadmin.bookings'), value: stats?.total_bookings || 0, color: 'var(--warning)' },
    { label: t('superadmin.revenue'), value: `$${stats?.total_revenue || 0}`, color: 'var(--success)' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0 }}>{t('superadmin.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{t('superadmin.subtitle')}</p>
        </div>
        <Link to="/super-admin/tenants" className="btn btn--primary">{t('superadmin.manage_tenants')}</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div key={card.label} className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>{t('superadmin.quick_actions')}</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/super-admin/tenants" className="btn btn--primary">{t('superadmin.view_all')}</Link>
          <Link to="/super-admin/tenants/new" className="btn btn--outline">{t('superadmin.create_tenant')}</Link>
          <Link to="/saas/plans" className="btn btn--outline">{t('superadmin.view_plans')}</Link>
        </div>
      </div>
    </div>
  );
}
