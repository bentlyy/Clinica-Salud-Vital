import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTenants, updateTenant, getHealthScores } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';
import CreateTenantModal from '../components/CreateTenantModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import './superadmin-theme.css';

const FILTER_ALL = 'all';
const FILTER_ACTIVE = 'active';
const FILTER_INACTIVE = 'inactive';

export default function SuperAdminTenantsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [healthScores, setHealthScores] = useState({});

  const limit = 20;

  const load = useCallback(async (p = page, s = search, f = filter) => {
    setLoading(true);
    try {
      const filters = {};
      if (s) filters.search = s;
      if (f === FILTER_ACTIVE) filters.active = true;
      else if (f === FILTER_INACTIVE) filters.active = false;
      const result = await listTenants(p, limit, filters);
      setTenants(result.data || []);
      setTotal(result.pagination?.total || 0);
      setError('');
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setTenants([]);
        setError(err.response?.data?.error || 'Error al cargar tenants');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    const controller = new AbortController();
    load(page, search, filter);
    return () => controller.abort();
  }, [page, filter, load]);

  useEffect(() => {
    getHealthScores().then((res) => {
      const data = Array.isArray(res) ? res : (res.data ?? []);
      const map = {};
      data.forEach((h) => { map[h.id] = h.health_score; });
      setHealthScores(map);
    }).catch(() => {});
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleToggleActive = async (tenant) => {
    setTogglingId(tenant.id);
    try {
      await updateTenant(tenant.id, { active: !tenant.active });
      setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, active: !t.active } : t));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreated = () => {
    setPage(1);
    setSearch('');
    setFilter(FILTER_ALL);
    load(1, '', FILTER_ALL);
  };

  const totalPages = Math.ceil(total / limit);

  const getInitials = (name) => {
    return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const getTenantColor = (index) => {
    const colors = [
      'linear-gradient(135deg, #0d9488, #0f766e)',
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #f97316, #ea580c)',
      'linear-gradient(135deg, #6b7280, #4b5563)',
    ];
    return colors[index % colors.length];
  };

  return (
    <div>
      {/* Page Header */}
      <div className="sa-page-header">
        <div>
          <h2>{t('superadmin.manage_tenants')}</h2>
          <p>{total} tenants</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + {t('superadmin.create_tenant')}
        </Button>
      </div>

      {error && <Alert variant="error" style={{ margin: '16px 0' }}>{error}</Alert>}

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder={t('superadmin.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ds-input"
            style={{ flex: 1 }}
          />
          <Button variant="primary" onClick={() => setPage(1)}>{t('superadmin.search')}</Button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant={filter === FILTER_ALL ? 'primary' : 'outline'} size="sm" onClick={() => handleFilterChange(FILTER_ALL)}>
            {t('superadmin.view_all') || 'Todos'}
          </Button>
          <Button variant={filter === FILTER_ACTIVE ? 'primary' : 'outline'} size="sm" onClick={() => handleFilterChange(FILTER_ACTIVE)}>
            {t('superadmin.active_label')}
          </Button>
          <Button variant={filter === FILTER_INACTIVE ? 'primary' : 'outline'} size="sm" onClick={() => handleFilterChange(FILTER_INACTIVE)}>
            {t('superadmin.inactive')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="ds-table-loading">
          {[1,2,3,4,5].map(i => <div key={i} className="ds-table-loading-row"><div className="ds-table-loading-cell" style={{width:'100%'}}/><div className="ds-table-loading-cell" style={{width:'80%'}}/><div className="ds-table-loading-cell" style={{width:'60%'}}/></div>)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="ds-table-empty">
          <div className="ds-table-empty-icon">📋</div>
          <div className="ds-table-empty-text">{t('superadmin.no_tenants')}</div>
        </div>
      ) : (
        <>
          <div className="sa-card">
            <div className="sa-table-container">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Dominio</th>
                    <th>Usuarios</th>
                    <th>Doctores</th>
                    <th>Citas</th>
                    <th>Plan</th>
                    <th>Salud</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant, index) => {
                    const score = healthScores[tenant.id] ?? null;
                    const getScoreColor = (s: number) => s >= 80 ? 'var(--ds-success-500)' : s >= 50 ? '#fbbf24' : s >= 20 ? '#fb923c' : '#ef4444';
                    return (
                    <tr key={tenant.id}>
                      <td>
                        <div className="sa-tenant-name-cell">
                          <div className="sa-tenant-logo" style={{ background: getTenantColor(index) }}>
                            {getInitials(tenant.name)}
                          </div>
                          <div className="sa-tenant-name-text">
                            <strong>{tenant.name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{tenant.domain || '-'}</td>
                      <td>{Number(tenant.total_users ?? 0).toLocaleString()}</td>
                      <td>{tenant.total_doctors ?? 0}</td>
                      <td>{Number(tenant.total_bookings ?? 0).toLocaleString()}</td>
                      <td>
                        <span className={`sa-badge-plan ${tenant.plan === 'enterprise' ? 'sa-badge-enterprise' : tenant.plan === 'pro' ? 'sa-badge-pro' : 'sa-badge-basic'}`}>
                          {tenant.plan || 'Basico'}
                        </span>
                      </td>
                      <td>
                        {score !== null ? (
                          <span style={{ fontWeight: 700, color: getScoreColor(score) }}>{score}</span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-tertiary)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`sa-badge ${tenant.active ? 'sa-badge-active' : 'sa-badge-inactive'}`}>
                          {tenant.active ? t('superadmin.active_label') : t('superadmin.inactive')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="sa-detail-back"
                            title="Ver detalle"
                            onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                          >
                            👁️
                          </button>
                          <button
                            className="sa-detail-back"
                            title={tenant.active ? 'Desactivar' : 'Reactivar'}
                            onClick={() => handleToggleActive(tenant)}
                            disabled={togglingId === tenant.id}
                          >
                            {togglingId === tenant.id ? '...' : (tenant.active ? '⛔' : '✅')}
                          </button>
                        </div>
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
                {t('superadmin.previous')}
              </Button>
              <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                {t('superadmin.page_of', { page, total: totalPages })}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                {t('superadmin.next')}
              </Button>
            </div>
          )}
        </>
      )}

      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
