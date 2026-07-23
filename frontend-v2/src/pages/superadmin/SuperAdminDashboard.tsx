import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import {
  getSuperAdminStats,
  getTenants,
  type Tenant,
} from '@/api/super-admin';
import './SuperAdminDashboard.css';

/* ── types ────────────────────────────────────────────────────────── */

interface AdminStats {
  totalTenants: number;
  mrr: number;
  totalUsers: number;
  uptime: number;
}

interface TenantRow extends Tenant {
  users_count?: number;
  plan?: string;
}

/* ── helpers ──────────────────────────────────────────────────────── */

const formatMRR = (value: number): string =>
  `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatUptime = (value: number): string => `${value.toFixed(1)}%`;

/* ── skeleton pieces ──────────────────────────────────────────────── */

const StatSkeleton = () => (
  <div className="sa-stat-card sa-skeleton-card">
    <div className="sa-stat-icon sa-skeleton sa-skeleton--icon" />
    <div className="sa-stat-body">
      <div className="sa-skeleton sa-skeleton--value" />
      <div className="sa-skeleton sa-skeleton--label" />
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr className="sa-skeleton-row">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i}>
        <div className="sa-skeleton sa-skeleton--table-cell" />
      </td>
    ))}
  </tr>
);

/* ── component ────────────────────────────────────────────────────── */

export default function SuperAdminDashboard() {
  const { t: _t } = useI18n();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tenantsRes] = await Promise.allSettled([
        getSuperAdminStats(),
        getTenants(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value?.data ?? statsRes.value;
        setStats({
          totalTenants: raw.totalTenants ?? 0,
          mrr: raw.mrr ?? 0,
          totalUsers: raw.totalUsers ?? 0,
          uptime: raw.uptime ?? 0,
        });
      }

      if (tenantsRes.status === 'fulfilled') {
        const raw = tenantsRes.value?.data ?? tenantsRes.value;
        setTenants(Array.isArray(raw) ? raw.slice(0, 10) : []);
      }

      const allFailed = [statsRes, tenantsRes].every(
        (r) => r.status === 'rejected',
      );
      if (allFailed) throw new Error('No se pudieron cargar los datos del panel.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cargar el panel.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── error state ─────────────────────────────────────────────── */
  if (error && !loading) {
    return (
      <div className="superadmin-dashboard">
        <div className="sa-error">
          <div className="sa-error__icon">&#9888;</div>
          <h3 className="sa-error__title">Error al cargar el panel</h3>
          <p className="sa-error__text">{error}</p>
          <button className="sa-error__btn" onClick={fetchData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="superadmin-dashboard">
      {/* ── page header ────────────────────────────────────────── */}
      <header className="sa-header">
        <div className="sa-header-left">
          <nav className="sa-breadcrumb" aria-label="Breadcrumb">
            <span className="sa-breadcrumb-item">Super Admin</span>
            <span className="sa-breadcrumb-sep">/</span>
            <span className="sa-breadcrumb-item sa-breadcrumb-active">Panel</span>
          </nav>
          <h1 className="sa-header__title">Super Admin Panel</h1>
          <p className="sa-header__subtitle">Vista global del sistema</p>
        </div>
      </header>

      {/* ── stats grid ─────────────────────────────────────────── */}
      <section className="sa-stats" aria-label="Estadisticas globales">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="sa-stat-card">
              <div className="sa-stat-icon sa-stat-icon--teal">&#127970;</div>
              <div className="sa-stat-body">
                <span className="sa-stat-value">{stats?.totalTenants ?? 0}</span>
                <span className="sa-stat-label">Tenants</span>
              </div>
            </div>

            <div className="sa-stat-card">
              <div className="sa-stat-icon sa-stat-icon--green">&#128176;</div>
              <div className="sa-stat-body">
                <span className="sa-stat-value">{formatMRR(stats?.mrr ?? 0)}</span>
                <span className="sa-stat-label">MRR</span>
              </div>
            </div>

            <div className="sa-stat-card">
              <div className="sa-stat-icon sa-stat-icon--blue">&#128101;</div>
              <div className="sa-stat-body">
                <span className="sa-stat-value">{stats?.totalUsers ?? 0}</span>
                <span className="sa-stat-label">Usuarios</span>
              </div>
            </div>

            <div className="sa-stat-card">
              <div className="sa-stat-icon sa-stat-icon--amber">&#9201;</div>
              <div className="sa-stat-body">
                <span className="sa-stat-value">{formatUptime(stats?.uptime ?? 0)}</span>
                <span className="sa-stat-label">Uptime</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── main content: table + revenue sidebar ──────────────── */}
      <div className="sa-content">
        {/* ── tenants table ──────────────────────────────────── */}
        <section className="sa-panel sa-panel--table" aria-label="Tenants">
          <div className="sa-panel__header">
            <h2 className="sa-panel__title">Tenants</h2>
            <span className="sa-panel__badge">{tenants.length} registros</span>
          </div>

          <div className="sa-table-wrapper">
            <table className="sa-data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dominio</th>
                  <th>Estado</th>
                  <th>Usuarios</th>
                  <th>Plan</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : tenants.length === 0 ? (
                  <tr className="sa-empty-row">
                    <td colSpan={6}>No hay tenants registrados.</td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="sa-cell-name">
                        <div className="sa-tenant-name">
                          <div className="sa-tenant-avatar">
                            {tenant.name
                              .split(' ')
                              .map((w: string) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <span>{tenant.name}</span>
                        </div>
                      </td>
                      <td className="sa-cell-domain">{tenant.domain}</td>
                      <td>
                        <span
                          className={`sa-badge ${
                            tenant.active ? 'sa-badge--active' : 'sa-badge--inactive'
                          }`}
                        >
                          <span className="sa-badge__dot" />
                          {tenant.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{tenant.users_count ?? '--'}</td>
                      <td>
                        <span className="sa-badge sa-badge--plan">
                          {tenant.plan ?? 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="sa-actions">
                          <button
                            className="sa-action-btn"
                            title="Ver detalles"
                            aria-label={`Ver detalles de ${tenant.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            className="sa-action-btn"
                            title="Editar"
                            aria-label={`Editar ${tenant.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="sa-action-btn sa-action-btn--danger"
                            title="Eliminar"
                            aria-label={`Eliminar ${tenant.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── revenue sidebar ────────────────────────────────── */}
        <aside className="sa-sidebar">
          {/* revenue card */}
          <section className="sa-panel sa-panel--revenue" aria-label="Ingresos recurrentes">
            <div className="sa-panel__header">
              <h2 className="sa-panel__title">Ingresos Recurrentes</h2>
            </div>
            <div className="sa-revenue-body">
              {loading ? (
                <>
                  <div className="sa-skeleton sa-skeleton--revenue-value" />
                  <div className="sa-skeleton sa-skeleton--revenue-sub" />
                  <div className="sa-skeleton sa-skeleton--chart" />
                </>
              ) : (
                <>
                  <div className="sa-revenue-value">
                    {formatMRR(stats?.mrr ?? 0)}
                  </div>
                  <div className="sa-revenue-sub">
                    <span className="sa-revenue-growth">+12.5%</span>
                    <span className="sa-revenue-period">vs. mes anterior</span>
                  </div>
                  {/* Mini chart placeholder */}
                  <div className="sa-revenue-chart">
                    <div className="sa-chart-bars">
                      {[35, 42, 38, 55, 48, 62, 58, 72, 68, 78, 74, 85].map((h, i) => (
                        <div
                          key={i}
                          className="sa-chart-bar"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="sa-chart-labels">
                      <span>Ene</span>
                      <span>Jun</span>
                      <span>Jul</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* system health */}
          <section className="sa-panel sa-panel--health" aria-label="Salud del sistema">
            <div className="sa-panel__header">
              <h2 className="sa-panel__title">Salud del Sistema</h2>
            </div>
            <div className="sa-health-body">
              {loading ? (
                <div className="sa-skeleton sa-skeleton--health" />
              ) : (
                <div className="sa-health-items">
                  <div className="sa-health-item">
                    <span className="sa-health-item__label">API Principal</span>
                    <span className="sa-health-status sa-health-status--ok">Operational</span>
                  </div>
                  <div className="sa-health-item">
                    <span className="sa-health-item__label">Base de Datos</span>
                    <span className="sa-health-status sa-health-status--ok">Operational</span>
                  </div>
                  <div className="sa-health-item">
                    <span className="sa-health-item__label">Servicios ML</span>
                    <span className="sa-health-status sa-health-status--ok">Operational</span>
                  </div>
                  <div className="sa-health-item">
                    <span className="sa-health-item__label">CDN</span>
                    <span className="sa-health-status sa-health-status--ok">Operational</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
