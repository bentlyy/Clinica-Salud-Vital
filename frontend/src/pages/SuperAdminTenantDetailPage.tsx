import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTenantDetail, updateTenant, listUsers, toggleUserActive } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';

const ROLE_CONFIG = {
  admin: { icon: '🛡️', label: 'Administradores', color: '#6c5ce7' },
  doctor: { icon: '🩺', label: 'Doctores', color: '#0984e3' },
  lab_technician: { icon: '🔬', label: 'Técnicos de Laboratorio', color: '#e17055' },
  patient: { icon: '🧑‍⚕️', label: 'Pacientes', color: '#00b894' },
};

function ToggleSwitch({ active, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={active ? 'Desactivar' : 'Activar'}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: active ? '#00b894' : '#dfe6e9',
        transition: 'background 0.25s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: active ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.25s',
      }} />
    </button>
  );
}

function UserRow({ user, onToggle, toggling }) {
  const displayName = user.name || user.email || '—';
  const secondary = [user.rut, user.email].filter(Boolean).join(' · ');
  const roleKey = user.role === 'user' ? 'patient' : user.role;
  const cfg = ROLE_CONFIG[roleKey] || { icon: '👤', label: roleKey, color: '#636e72' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 8,
      background: user.active ? '#fff' : '#f8f9fa',
      opacity: user.active ? 1 : 0.5,
      transition: 'all 0.2s',
      border: '1px solid #eee',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: '0.9rem',
      }}>
        {user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2d3436', lineHeight: 1.3 }}>
          {user.name || '—'}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#636e72', lineHeight: 1.4 }}>
          {secondary}
        </div>
      </div>
      <ToggleSwitch active={user.active} onToggle={() => onToggle(user.id, user.active)} disabled={toggling === user.id} />
    </div>
  );
}

function RoleCard({ role, users, onToggle, toggling }) {
  const cfg = ROLE_CONFIG[role] || { icon: '👤', label: role, color: '#636e72' };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: 0,
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${cfg.color}20`,
      background: `linear-gradient(180deg, ${cfg.color}08, transparent)`,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: `1px solid ${cfg.color}15`,
        background: cfg.color + '08',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: cfg.color }}>{cfg.label}</span>
        <span style={{
          marginLeft: 'auto', background: cfg.color + '20',
          color: cfg.color, padding: '2px 10px', borderRadius: 12,
          fontSize: '0.8rem', fontWeight: 600,
        }}>{users.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', minHeight: 0 }}>
        {users.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 8px' }}>
            No hay {cfg.label.toLowerCase()} registrados
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.map(user => (
              <UserRow key={user.id} user={user} onToggle={onToggle} toggling={toggling} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [togglingUserId, setTogglingUserId] = useState(null);

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

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const filters = { tenantId: id };
      if (usersSearch) filters.search = usersSearch;
      const result = await listUsers(1, 200, filters);
      setUsers(result.data || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [id, usersSearch]);

  useEffect(() => {
    if (detail) {
      loadUsers();
    }
  }, [detail, loadUsers]);

  const grouped = useMemo(() => {
    const groups = { admin: [], doctor: [], lab_technician: [], patient: [] };
    for (const u of users) {
      const key = u.role === 'user' ? 'patient' : u.role;
      if (groups[key]) groups[key].push(u);
    }
    return groups;
  }, [users]);

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

      <div className="card" style={{ padding: 24, height: 560, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flexShrink: 0 }}>
          <h3 style={{ marginBottom: 4 }}>{t('superadmin.users')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            {users.length} Usuarios - {t('manage_staff.title')}
          </p>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
            <input
              type="text" value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              placeholder="Buscar por nombre, email o RUT..."
              className="form-input"
              style={{ paddingLeft: 34, fontSize: '0.9rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {usersLoading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
                <div>{t('manage_staff.loading')}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              {grouped.admin.length > 0 && (
                <div style={{ flexShrink: 0 }}>
                  <RoleCard role="admin" users={grouped.admin} onToggle={handleToggleUser} toggling={togglingUserId} />
                </div>
              )}
              {grouped.lab_technician.length > 0 && (
                <div style={{ flexShrink: 0 }}>
                  <RoleCard role="lab_technician" users={grouped.lab_technician} onToggle={handleToggleUser} toggling={togglingUserId} />
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <RoleCard role="doctor" users={grouped.doctor} onToggle={handleToggleUser} toggling={togglingUserId} />
                <RoleCard role="patient" users={grouped.patient} onToggle={handleToggleUser} toggling={togglingUserId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
