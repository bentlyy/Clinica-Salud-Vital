import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTenants, updateTenant, getHealthScores } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';
import CreateTenantModal from '../components/CreateTenantModal';
import Button from '../components/ui/Button';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { TextField } from '../components/ui/FormField';
import DataTable from '../components/ui/DataTable';
import Alert from '../components/ui/Alert';

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
    load(page, search, filter, { signal: controller.signal });
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

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={t('superadmin.manage_tenants')}
        subtitle={`${total} tenants`}
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + {t('superadmin.create_tenant')}
          </Button>
        }
      />

      {error && <Alert variant="error" style={{ margin: '16px 0' }}>{error}</Alert>}

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
          <div className="tenant-grid">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="ds-card tenant-card">
                <div className="tenant-card-header">
                  <div className="tenant-card-title">
                    <h3>{tenant.name}</h3>
                    <code className="tenant-id">{tenant.id}</code>
                  </div>
                  <Badge variant={tenant.active ? 'success' : 'danger'}>
                    {tenant.active ? t('superadmin.active_label') : t('superadmin.inactive')}
                  </Badge>
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
                  <div className="stat-item">
                    <span className="stat-value" style={{ color: (() => {
                      const s = healthScores[tenant.id] ?? 0;
                      return s >= 80 ? 'var(--chart-green)' : s >= 50 ? '#fbbf24' : s >= 20 ? '#fb923c' : '#ef4444';
                    })() }}>
                      {healthScores[tenant.id] ?? '—'}
                    </span>
                    <span className="stat-label">Salud</span>
                  </div>
                </div>

                <div className="tenant-card-actions">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}>
                    {t('superadmin.view')}
                  </Button>
                  <Button
                    variant={tenant.active ? 'warning' : 'success'}
                    size="sm"
                    onClick={() => handleToggleActive(tenant)}
                    disabled={togglingId === tenant.id}
                  >
                    {togglingId === tenant.id ? '...' : (tenant.active ? t('superadmin.inactive') : t('superadmin.active_label'))}
                  </Button>
                </div>
              </div>
            ))}
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
    </PageContainer>
  );
}
