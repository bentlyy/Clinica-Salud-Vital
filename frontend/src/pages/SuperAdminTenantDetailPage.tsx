import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTenantDetail, updateTenant, listUsers, toggleUserActive } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import './superadmin-theme.css';

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
    <div className="sa-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: '1px solid var(--ds-border)',
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
          <p style={{ fontSize: '0.85rem', color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: '24px 8px' }}>
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ margin: '0 auto 16px', width: 36, height: 36, border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-primary-500)', borderRadius: '50%', animation: 'ds-spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--ds-text-secondary)' }}>Cargando detalles del tenant...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <h2>{t('superadmin.tenant_not_found')}</h2>
        <Button variant="primary" onClick={() => navigate('/super-admin/tenants')}>{t('superadmin.back_to_list')}</Button>
      </div>
    );
  }

  const { tenant, stats, subscription } = detail;
  const initials = (tenant.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      {/* Back button */}
      <Button variant="outline" size="sm" style={{ marginBottom: 16 }} onClick={() => navigate('/super-admin/tenants')}>
        ← {t('superadmin.back_to_list')}
      </Button>

      {/* Detail Header */}
      <div className="sa-detail-header">
        <div className="sa-detail-logo" style={{ background: 'linear-gradient(135deg, var(--ds-primary-500), var(--ds-primary-700))' }}>
          {initials}
        </div>
        <div className="sa-detail-info">
          <h2>{tenant.name}</h2>
          <p>{tenant.domain || 'saludvital.com'}</p>
        </div>
        <div className="sa-detail-meta">
          <span className={`sa-badge ${tenant.active ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
            {tenant.active ? t('superadmin.active_label') : t('superadmin.inactive')}
          </span>
          <span className={`sa-badge-plan ${tenant.plan === 'enterprise' ? 'sa-badge-enterprise' : tenant.plan === 'pro' ? 'sa-badge-pro' : 'sa-badge-basic'}`}>
            {tenant.plan || 'Básico'}
          </span>
        </div>
      </div>

      {error && <Alert variant="error" style={{ margin: '16px 0' }}>{error}</Alert>}
      {success && <Alert variant="success" style={{ margin: '16px 0' }}>{success}</Alert>}

      {/* Stats Grid */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon blue">👥</div>
          </div>
          <div className="sa-stat-card-value">{stats?.patient_count || 0}</div>
          <div className="sa-stat-card-label">{t('saas.patients')}</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon green">🩺</div>
          </div>
          <div className="sa-stat-card-value">{stats?.doctor_count || 0}</div>
          <div className="sa-stat-card-label">{t('saas.doctors')}</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon teal">📅</div>
          </div>
          <div className="sa-stat-card-value">{stats?.booking_count || 0}</div>
          <div className="sa-stat-card-label">{t('superadmin.bookings')}</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon orange">⚡</div>
          </div>
          <div className="sa-stat-card-value">99.99%</div>
          <div className="sa-stat-card-label">Uptime</div>
        </div>
      </div>

      {/* Configuration and Features */}
      <div className="sa-grid-2 sa-mb-28">
        {/* Configuration */}
        <div className="sa-card">
          <div className="sa-card-header">
            <h2>⚙️ Configuración</h2>
          </div>
          <div className="sa-card-body">
            <div className="sa-config-grid">
              <div className="sa-config-item">
                <label>Administrador</label>
                <span>{tenant.admin_email || '-'}</span>
              </div>
              <div className="sa-config-item">
                <label>Fecha de Creación</label>
                <span>{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}</span>
              </div>
              <div className="sa-config-item">
                <label>Almacenamiento</label>
                <span>12.4 GB / 50 GB</span>
              </div>
              <div className="sa-config-item">
                <label>Zona Horaria</label>
                <span>{form.timezone || 'America/Santiago'}</span>
              </div>
              <div className="sa-config-item">
                <label>Idioma</label>
                <span>{form.locale === 'es' ? 'Español' : form.locale === 'en' ? 'English' : form.locale}</span>
              </div>
              <div className="sa-config-item">
                <label>API Key</label>
                <span>sv_sk_••••••••••••••••</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="sa-card">
          <div className="sa-card-header">
            <h2>🎯 Funcionalidades</h2>
          </div>
          <div className="sa-card-body">
            <div className="sa-feature-tags">
              <span className="sa-feature-tag enabled">📅 Gestión de Citas</span>
              <span className="sa-feature-tag enabled">📋 Historial Clínico</span>
              <span className="sa-feature-tag enabled">💊 Inventario Farmacia</span>
              <span className="sa-feature-tag enabled">📊 Reportes Avanzados</span>
              <span className="sa-feature-tag enabled">🤖 Chatbot IA</span>
              <span className="sa-feature-tag enabled">📧 Notificaciones Email</span>
              <span className="sa-feature-tag enabled">📱 App Móvil</span>
              <span className="sa-feature-tag enabled">🔗 Integración Lab</span>
              <span className="sa-feature-tag enabled">💳 Facturación</span>
              <span className="sa-feature-tag enabled">👥 Multi-sucursal</span>
              <span className="sa-feature-tag disabled">🎥 Telemedicina</span>
              <span className="sa-feature-tag disabled">🧬 Genómica</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      {subscription && (
        <div className="sa-card sa-mb-28">
          <div className="sa-card-header">
            <h2>💳 Suscripción</h2>
          </div>
          <div className="sa-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ds-text-tertiary)', fontWeight: 600, marginBottom: 4 }}>Plan Actual</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ds-primary-700)' }}>{subscription.plan_name}</div>
                <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginTop: 2 }}>$4,200/mes · Facturación anual</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ds-text-tertiary)', fontWeight: 600, marginBottom: 4 }}>Próximo Pago</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                  {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '-'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginTop: 2 }}>Tarjeta terminada en •4242</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ds-text-tertiary)', fontWeight: 600, marginBottom: 4 }}>Ciclo de Facturación</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text-primary)' }}>Mes 19 de 24</div>
                <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginTop: 2 }}>Renovación: Jul 2027</div>
              </div>
              <div>
                <Button variant="primary">Administrar Suscripción</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="sa-card sa-mb-28">
        <div className="sa-card-header">
          <h2>⚙️ Configuración del Tenant</h2>
        </div>
        <div className="sa-card-body">
          <div className="sa-config-grid">
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)', marginBottom: 6 }}>{t('superadmin.name')}</label>
              <input type="text" className="ds-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)', marginBottom: 6 }}>{t('super_admin.tenant_locale_label')}</label>
              <select className="ds-input" value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))} style={{ width: '100%' }}>
                <option value="es">{t('super_admin.spanish')}</option>
                <option value="en">{t('super_admin.english')}</option>
                <option value="pt">{t('super_admin.portuguese')}</option>
                <option value="fr">{t('super_admin.french')}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)', marginBottom: 6 }}>{t('saas.timezone')}</label>
              <input type="text" className="ds-input" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                {t('superadmin.active_label')}
              </label>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? t('superadmin.saving') : t('superadmin.save')}
            </Button>
          </div>
        </div>
      </div>

      {/* Users Section */}
      <div className="sa-card" style={{ minHeight: 750, display: 'flex', flexDirection: 'column' }}>
        <div className="sa-card-header">
          <div>
            <h2>👥 Usuarios</h2>
            <p style={{ margin: '2px 0 0', color: 'var(--ds-text-secondary)', fontSize: 'var(--ds-text-sm)' }}>
              {users.length} Usuarios — {t('manage_staff.title')}
            </p>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-tertiary)', fontSize: '0.85rem' }}>🔍</span>
            <input
              type="text" value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              placeholder="Buscar por nombre, email o RUT..."
              className="ds-input"
              style={{ paddingLeft: 34, fontSize: '0.9rem', width: 280 }}
            />
          </div>
        </div>

        <div className="sa-card-body" style={{ flex: 1, minHeight: 0 }}>
          {usersLoading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--ds-text-tertiary)' }}>
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
