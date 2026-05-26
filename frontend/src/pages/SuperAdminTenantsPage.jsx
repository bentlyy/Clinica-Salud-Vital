import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTenants, deleteTenant } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';

export default function SuperAdminTenantsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const limit = 20;

  const load = async (p = page, s = search) => {
    setLoading(true);
    try {
      const filters = {};
      if (s) filters.search = s;
      const result = await listTenants(p, limit, filters);
      setTenants(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTenant(id);
      setDeleteConfirm(null);
      load();
    } catch {
      alert('Error deleting tenant');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{t('superadmin.manage_tenants')}</h1>
        <button className="btn btn--primary" onClick={() => navigate('/super-admin/tenants/new')}>{t('superadmin.create_tenant')}</button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text" className="input" placeholder={t('superadmin.search')}
          value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn--primary">{t('superadmin.search')}</button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>{t('superadmin.title')}...</div>
      ) : tenants.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('superadmin.no_tenants')}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>{t('superadmin.id')}</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>{t('superadmin.name')}</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>{t('superadmin.domain')}</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>{t('superadmin.status')}</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>{t('superadmin.created')}</th>
                  <th style={{ textAlign: 'right', padding: 12 }}>{t('superadmin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 12 }}><code>{tenant.id}</code></td>
                    <td style={{ padding: 12 }}>{tenant.name}</td>
                    <td style={{ padding: 12 }}>{tenant.domain}</td>
                    <td style={{ padding: 12 }}>
                      <span className={`badge badge--${tenant.active ? 'success' : 'error'}`}>
                        {tenant.active ? t('superadmin.active_label') : t('superadmin.inactive')}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <button className="btn btn--outline btn--sm" style={{ marginRight: 4 }}
                        onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}>{t('superadmin.view')}</button>
                      {deleteConfirm === tenant.id ? (
                        <>
                          <button className="btn btn--danger btn--sm" onClick={() => handleDelete(tenant.id)}>{t('saas.confirm')}</button>
                          <button className="btn btn--outline btn--sm" onClick={() => setDeleteConfirm(null)}>{t('saas.cancel')}</button>
                        </>
                      ) : (
                        <button className="btn btn--outline btn--sm" onClick={() => setDeleteConfirm(tenant.id)}
                          style={{ color: 'var(--danger)' }}>{t('superadmin.delete')}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('superadmin.previous')}</button>
              <span style={{ alignSelf: 'center', fontSize: 14 }}>{t('superadmin.page_of', { page, total: totalPages })}</span>
              <button className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('superadmin.next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
