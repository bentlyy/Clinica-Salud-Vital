import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTenantDetail, updateTenant, listUsers, toggleUserActive } from '../api/super-admin';
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

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null);
  const usersLimit = 50;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await getTenantDetail(id, { signal: controller.signal });
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
    })();
    return () => controller.abort();
  }, [id, t]);

  const loadUsers = useCallback(async (p = usersPage) => {
    setUsersLoading(true);
    try {
      const result = await listUsers(p, usersLimit, { tenantId: id });
      setUsers(result.data || []);
      setUsersTotal(result.pagination?.total || 0);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [id, usersPage]);

  useEffect(() => {
    if (detail) {
      loadUsers();
    }
  }, [detail, loadUsers]);

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

  const handleToggleUser = async (userId, currentActive) => {
    setTogglingUserId(userId);
    try {
      await toggleUserActive(userId, !currentActive);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, active: !u.active } : u));
    } catch {
      setError('Error al cambiar estado del usuario');
    } finally {
      setTogglingUserId(null);
    }
  };

  const usersTotalPages = Math.ceil(usersTotal / usersLimit);

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
    <div className="page-container-wide" style={{ padding: '32px 24px' }}>
      <button className="btn btn--outline btn--sm" style={{ marginBottom: 16 }} onClick={() => navigate('/super-admin/tenants')}>
        ← {t('superadmin.back_to_list')}
      </button>

      <div className="page-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{tenant.name}</h1>
          <code style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('superadmin.id')}: {tenant.id}</code>
        </div>
        <span className={`badge badge--${tenant.active ? 'success' : 'error'}`} style={{ fontSize: 14, padding: '6px 14px' }}>
          {tenant.active ? t('superadmin.active_label') : t('superadmin.inactive')}
        </span>
      </div>

      {error && <div className="alert alert--error" style={{ margin: '16px 0' }}>{error}</div>}
      {success && <div className="alert alert--success" style={{ margin: '16px 0' }}>{success}</div>}

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{stats?.patient_count || 0}</div>
          <div className="stat-label">{t('saas.patients')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.doctor_count || 0}</div>
          <div className="stat-label">{t('saas.doctors')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.booking_count || 0}</div>
          <div className="stat-label">{t('superadmin.bookings')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{stats?.invoice_count || 0}</div>
          <div className="stat-label">{t('saas.invoices')}</div>
        </div>
      </div>

      {subscription && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('superadmin.subscription')}</h3>
          <div className="detail-grid-2col">
            <div><span className="detail-label">{t('tenant.plan')}:</span> <strong>{subscription.plan_name}</strong></div>
            <div><span className="detail-label">{t('tenant.status')}:</span> <span className={`badge badge--${subscription.status === 'active' ? 'success' : 'warning'}`}>{subscription.status}</span></div>
            <div><span className="detail-label">{t('tenant.period_start')}:</span> {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : '-'}</div>
            <div><span className="detail-label">{t('tenant.period_end')}:</span> {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '-'}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
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

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 4 }}>{t('superadmin.users')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          {usersTotal} {t('superadmin.users')} - {t('manage_staff.title')}
        </p>

        {usersLoading ? (
          <div className="loading-state">{t('manage_staff.loading')}</div>
        ) : users.length === 0 ? (
          <div className="empty-state"><p>{t('manage_staff.no_users')}</p></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('admin.name')}</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>{t('manage_staff.active')}</th>
                    <th style={{ textAlign: 'right' }}>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name || '-'}</td>
                      <td><code>{user.email}</code></td>
                      <td><span className="badge badge--info">{user.role}</span></td>
                      <td>
                        <span className={`badge badge--${user.active ? 'success' : 'error'}`}>
                          {user.active ? t('manage_staff.active') : t('manage_staff.inactive')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={`btn btn--sm ${user.active ? 'btn--warning' : 'btn--success'}`}
                          onClick={() => handleToggleUser(user.id, user.active)}
                          disabled={togglingUserId === user.id}
                        >
                          {togglingUserId === user.id ? '...' : (user.active ? t('manage_staff.deactivate') : t('manage_staff.activate'))}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {usersTotalPages > 1 && (
              <div className="pagination-row" style={{ marginTop: 16 }}>
                <button className="btn btn--outline btn--sm" disabled={usersPage <= 1} onClick={() => setUsersPage(usersPage - 1)}>
                  {t('superadmin.previous')}
                </button>
                <span className="pagination-info">{t('superadmin.page_of', { page: usersPage, total: usersTotalPages })}</span>
                <button className="btn btn--outline btn--sm" disabled={usersPage >= usersTotalPages} onClick={() => setUsersPage(usersPage + 1)}>
                  {t('superadmin.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
