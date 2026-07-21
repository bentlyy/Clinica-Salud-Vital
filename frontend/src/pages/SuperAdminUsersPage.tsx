import { useState, useEffect, useCallback } from 'react';
import { listUsers, toggleUserActive, listTenants } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import './superadmin-theme.css';

const ROLES = [
  { value: '', label: 'Todos' },
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Paciente' },
  { value: 'lab_technician', label: 'Lab' },
  { value: 'superadmin', label: 'Super Admin' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  doctor: 'linear-gradient(135deg, #10b981, #059669)',
  patient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  lab_technician: 'linear-gradient(135deg, #f97316, #ea580c)',
  superadmin: 'linear-gradient(135deg, #ef4444, #dc2626)',
  user: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
};

export default function SuperAdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const limit = 25;

  const load = useCallback(async (p = page, s = search, r = roleFilter, t = tenantFilter) => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (s) filters.search = s;
      if (r) filters.role = r;
      if (t) filters.tenantId = t;
      const result = await listUsers(p, limit, filters);
      setUsers(result.data || []);
      setTotal(result.pagination?.total || 0);
      setError('');
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setUsers([]);
        setError(err.response?.data?.error || 'Error al cargar usuarios');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, tenantFilter]);

  useEffect(() => {
    load(page, search, roleFilter, tenantFilter);
  }, [page, roleFilter, tenantFilter]);

  useEffect(() => {
    listTenants(1, 100).then((res) => {
      setTenants(res.data || []);
    }).catch(() => {});
  }, []);

  const handleSearch = () => setPage(1);

  const handleToggleActive = async (user) => {
    setTogglingId(user.id);
    try {
      await toggleUserActive(user.id, !user.active);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getInitials = (name) => {
    return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role) => {
    const r = ROLES.find((r) => r.value === role);
    return r ? r.label : role;
  };

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p>{total} usuarios en todas las clínicas</p>
        </div>
      </div>

      {error && <Alert variant="error" style={{ margin: '16px 0' }}>{error}</Alert>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="ds-input"
            style={{ flex: 1 }}
          />
          <Button variant="primary" onClick={handleSearch}>Buscar</Button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
            className="ds-input"
            style={{ minWidth: 150 }}
          >
            <option value="">Todas las clínicas</option>
            {tenants.map((ten) => (
              <option key={ten.id} value={ten.id}>{ten.name}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="ds-input"
            style={{ minWidth: 130 }}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ds-table-loading">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="ds-table-loading-row">
              <div className="ds-table-loading-cell" style={{ width: '100%' }} />
              <div className="ds-table-loading-cell" style={{ width: '80%' }} />
              <div className="ds-table-loading-cell" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="ds-table-empty">
          <div className="ds-table-empty-icon">👥</div>
          <div className="ds-table-empty-text">No se encontraron usuarios</div>
        </div>
      ) : (
        <>
          <div className="sa-card">
            <div className="sa-table-container">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Clínica</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const tenant = tenants.find((ten) => ten.id === user.tenant_id);
                    const color = ROLE_COLORS[user.role] || ROLE_COLORS.user;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="sa-tenant-name-cell">
                            <div className="sa-tenant-logo" style={{ background: color }}>
                              {getInitials(user.name || user.email)}
                            </div>
                            <div className="sa-tenant-name-text">
                              <strong>{user.name || 'Sin nombre'}</strong>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{user.email}</td>
                        <td>
                          <span className="sa-badge-plan" style={{
                            background: color.replace('linear-gradient(135deg, ', '').split(',')[0] + '20',
                            color: color.replace('linear-gradient(135deg, ', '').split(',')[0],
                          }}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                          {tenant?.name || user.tenant_id || '-'}
                        </td>
                        <td>
                          <span className={`sa-badge ${user.active !== false ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
                            {user.active !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="sa-detail-back"
                            title={user.active !== false ? 'Desactivar' : 'Reactivar'}
                            onClick={() => handleToggleActive(user)}
                            disabled={togglingId === user.id}
                          >
                            {togglingId === user.id ? '...' : (user.active !== false ? '⛔' : '✅')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
