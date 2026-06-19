import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTenants, updateTenant } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';
import CreateTenantModal from '../components/CreateTenantModal';

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
    load(page, search, filter, { signal: controller.signal });
    return () => controller.abort();
  }, [page, filter, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

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

  return (
    <div className="page-container-wide" style={{ padding: '32px 24px' }}>
      <div className="page-header-row">
        <div>
          <h1 style={{ margin: 0 }}>{t('superadmin.manage_tenants')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>{total} tenants</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreateModal(true)}>
          + {t('superadmin.create_tenant')}
        </button>
      </div>

      {error && <div className="alert alert--error" style={{ margin: '16px 0' }}>{error}</div>}

      <div className="search-filter-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text" className="input" placeholder={t('superadmin.search')}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn--primary">{t('superadmin.search')}</button>
        </form>

        <div className="filter-btns">
          <button
            className={`btn btn--sm ${filter === FILTER_ALL ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => handleFilterChange(FILTER_ALL)}
          >{t('superadmin.view_all') || 'Todos'}</button>
          <button
            className={`btn btn--sm ${filter === FILTER_ACTIVE ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => handleFilterChange(FILTER_ACTIVE)}
          >{t('superadmin.active_label')}</button>
          <button
            className={`btn btn--sm ${filter === FILTER_INACTIVE ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => handleFilterChange(FILTER_INACTIVE)}
          >{t('superadmin.inactive')}</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">{t('superadmin.title')}...</div>
      ) : tenants.length === 0 ? (
        <div className="empty-state">
          <p>{t('superadmin.no_tenants')}</p>
        </div>
      ) : (
        <>
          <div className="tenant-grid">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="card tenant-card">
                <div className="tenant-card-header">
                  <div className="tenant-card-title">
                    <h3>{tenant.name}</h3>
                    <code className="tenant-id">{tenant.id}</code>
                  </div>
                  <span className={`badge badge--${tenant.active ? 'success' : 'error'}`}>
                    {tenant.active ? t('superadmin.active_label') : t('superadmin.inactive')}
                  </span>
                </div>

                <div className="tenant-card-domain">
                  <span className="tenant-label">{t('superadmin.domain')}</span>
                  <span>{tenant.domain || '-'}</span>
                </div>

                <div className="tenant-card-meta">
                  <span>{t('superadmin.created')}: {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}</span>
                </div>

                <div className="tenant-card-stats">
                  <div className="stat-item">
                    <span className="stat-value">{tenant.total_bookings ?? 0}</span>
                    <span className="stat-label">{t('superadmin.bookings')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{tenant.total_users ?? 0}</span>
                    <span className="stat-label">{t('superadmin.users')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{tenant.total_doctors ?? 0}</span>
                    <span className="stat-label">{t('superadmin.doctors')}</span>
                  </div>
                </div>

                <div className="tenant-card-actions">
                  <button className="btn btn--outline btn--sm" onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}>
                    {t('superadmin.view')}
                  </button>
                  <button
                    className={`btn btn--sm ${tenant.active ? 'btn--warning' : 'btn--success'}`}
                    onClick={() => handleToggleActive(tenant)}
                    disabled={togglingId === tenant.id}
                  >
                    {togglingId === tenant.id ? '...' : (tenant.active ? t('superadmin.inactive') : t('superadmin.active_label'))}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-row">
              <button className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('superadmin.previous')}
              </button>
              <span className="pagination-info">{t('superadmin.page_of', { page, total: totalPages })}</span>
              <button className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                {t('superadmin.next')}
              </button>
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
