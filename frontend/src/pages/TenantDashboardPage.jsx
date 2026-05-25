import { useState, useEffect } from 'react';
import { getMySubscription, cancelSubscription, getLimits, getUsageSummary } from '../api/saas';
import useAuth from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function TenantDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [limits, setLimits] = useState(null);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [subData, limitsData, usageData] = await Promise.all([
          getMySubscription(),
          getLimits(),
          getUsageSummary(),
        ]);
        setSubscription(subData.subscription);
        setPlan(subData.plan);
        setLimits(limitsData);
        setUsage(usageData);
      } catch {
        setError('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleCancel = async () => {
    try {
      await cancelSubscription();
      setSubscription((prev) => ({ ...prev, status: 'canceled' }));
      setShowCancel(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Cancelation failed');
    }
  };

  if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('tenant.panel_title')}...</div>;
  if (!user) return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('auth.login_success')}</div>;

  const planName = plan?.name || 'Sin plan';
  const planStatus = subscription?.status || 'inactive';
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A';

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 8 }}>{t('tenant.panel_title')}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        {t('tenant.welcome', { name: user?.name || user?.email })}
      </p>

      {error && <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('superadmin.subscription')}</h3>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('tenant.plan')}</span>
            <strong>{planName}</strong>
          </div>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('tenant.status')}</span>
            <span className={`badge badge--${planStatus === 'active' ? 'success' : 'warning'}`}>{planStatus}</span>
          </div>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('tenant.period_end')}</span>
            <span>{periodEnd}</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn--outline" style={{ flex: 1 }} onClick={() => navigate('/saas/plans')}>
              {t('saas.change_plan')}
            </button>
            {subscription?.status === 'active' && !showCancel && (
              <button className="btn btn--outline" style={{ color: 'var(--danger)' }} onClick={() => setShowCancel(true)}>
                {t('saas.cancel')}
              </button>
            )}
          </div>
          {showCancel && (
            <div className="card" style={{ marginTop: 12, padding: 16, background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>{t('saas.confirm_cancel')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn--danger" style={{ flex: 1 }} onClick={handleCancel}>{t('saas.confirm')}</button>
                <button className="btn btn--outline" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>{t('saas.go_back')}</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('tenant.limits_title')}</h3>
          {limits && (
            <>
              {['doctors', 'patients', 'storage'].map((key) => {
                const limit = limits[key];
                if (!limit) return null;
                const pct = limit.limit > 0 ? Math.min(100, Math.round((limit.current / limit.limit) * 100)) : limit.current > 0 ? 50 : 0;
                const label = key === 'doctors' ? t('saas.doctors') : key === 'patients' ? t('saas.patients') : t('saas.storage');
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                      <span>{label}</span>
                      <span>{limit.current} / {limit.limit < 0 ? '∞' : limit.limit}</span>
                    </div>
                    {limit.limit > 0 && (
                      <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--danger)' : 'var(--primary-500)', borderRadius: 3 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('saas.usage_30d')}</h3>
          {Object.keys(usage).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('saas.no_usage')}</p>
          ) : (
            Object.entries(usage).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</span>
                <strong>{String(value)}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>{t('tenant.config_title')}</h3>
        <div className="form-group">
          <label>{t('saas.clinic_name')}</label>
          <input type="text" className="input" defaultValue={user?.tenant_id === 'default' ? 'Mi Clínica' : user?.tenant_id} />
        </div>
        <div className="form-group">
          <label>{t('saas.contact_email')}</label>
          <input type="email" className="input" defaultValue={user?.email} />
        </div>
        <div className="form-group">
          <label>{t('saas.timezone')}</label>
          <select className="input">
            <option value="America/Santiago">America/Santiago (UTC-3)</option>
            <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
            <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
            <option value="America/Bogota">America/Bogota (UTC-5)</option>
          </select>
        </div>
        <button className="btn btn--primary">{t('saas.save_changes')}</button>
      </div>
    </div>
  );
}
