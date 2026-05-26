import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTenantDetail, updateTenant } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';

export default function SuperAdminTenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTenantDetail(id);
        setDetail(data);
        setForm({
          name: data.tenant.name || '',
          locale: data.tenant.locale || 'es',
          timezone: data.tenant.timezone || 'America/Santiago',
          active: data.tenant.active !== false,
        });
      } catch {
        setError(t('super_admin.tenant_error'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateTenant(id, form);
      setDetail((prev) => ({ ...prev, tenant: updated }));
      setSuccess(t('super_admin.tenant_saved'));
    } catch (err) {
      setError(err.response?.data?.error || t('super_admin.tenant_error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('superadmin.title')}...</div>;

  if (!detail) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>
        <h2>{t('superadmin.tenant_not_found')}</h2>
        <button className="btn btn--primary" onClick={() => navigate('/super-admin/tenants')}>{t('superadmin.back_to_list')}</button>
      </div>
    );
  }

  const { tenant, stats, subscription } = detail;

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <button className="btn btn--outline btn--sm" style={{ marginBottom: 16 }} onClick={() => navigate('/super-admin/tenants')}>
        ← {t('superadmin.back_to_list')}
      </button>

      <h1 style={{ marginBottom: 4 }}>{tenant.name}</h1>
      <code style={{ color: 'var(--text-secondary)' }}>{t('superadmin.id')}: {tenant.id}</code>

      {error && <div className="alert alert--error" style={{ margin: '16px 0' }}>{error}</div>}
      {success && <div className="alert alert--success" style={{ margin: '16px 0' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '24px 0' }}>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.patient_count || 0}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('saas.patients')}</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.doctor_count || 0}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('saas.doctors')}</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.booking_count || 0}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('superadmin.bookings')}</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.invoice_count || 0}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('saas.invoices')}</div>
        </div>
      </div>

      {subscription && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3>{t('superadmin.subscription')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>{t('tenant.plan')}:</span> <strong>{subscription.plan_name}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>{t('tenant.status')}:</span> <span className={`badge badge--${subscription.status === 'active' ? 'success' : 'warning'}`}>{subscription.status}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>{t('tenant.period_start')}:</span> {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : '-'}</div>
            <div><span style={{ color: 'var(--text-secondary)' }}>{t('tenant.period_end')}:</span> {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '-'}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>{t('superadmin.config')}</h3>
        <div className="form-group">
          <label>{t('superadmin.name')}</label>
          <input type="text" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>{t('super_admin.tenant_locale_label')}</label>
          <select className="input" value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}>
            <option value="es">{t('super_admin.spanish')}</option>
            <option value="en">{t('super_admin.english')}</option>
            <option value="pt">{t('super_admin.portuguese')}</option>
            <option value="fr">{t('super_admin.french')}</option>
          </select>
        </div>
        <div className="form-group">
          <label>{t('saas.timezone')}</label>
          <input type="text" className="input" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            {t('superadmin.active_label')}
          </label>
        </div>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? t('superadmin.saving') : t('superadmin.save')}
        </button>
      </div>
    </div>
  );
}
