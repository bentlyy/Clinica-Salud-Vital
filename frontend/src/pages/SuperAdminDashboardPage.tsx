import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboardAnalytics, getHealthScores, getAlerts, getTopTenants, getRevenueAnalytics
} from '../api/super-admin';
import { extractList } from '../utils/extract-list';
import Button from '../components/ui/Button';
import './superadmin-theme.css';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: string;
  colorClass: string;
}

function KpiCard({ label, value, delta, icon, colorClass }: KpiCardProps) {
  return (
    <div className="sa-stat-card">
      <div className="sa-stat-card-header">
        <div className={`sa-stat-card-icon ${colorClass}`}>{icon}</div>
        {delta !== undefined && (
          <span className={`sa-stat-card-trend ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? '+' : ''}{delta}% este mes
          </span>
        )}
      </div>
      <div className="sa-stat-card-value">{value}</div>
      <div className="sa-stat-card-label">{label}</div>
    </div>
  );
}

function AlertBadge({ severity }: { severity: string }) {
  const config: Record<string, { color: string; label: string }> = {
    critical: { color: '#ef4444', label: 'Crítica' },
    high: { color: '#fb923c', label: 'Alta' },
    medium: { color: '#fbbf24', label: 'Media' },
    low: { color: '#6b7280', label: 'Baja' },
  };
  const c = config[severity] || config.low;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
      background: c.color + '20', color: c.color,
    }}>{c.label}</span>
  );
}

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [healthScores, setHealthScores] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [topTenants, setTopTenants] = useState<Array<Record<string, unknown>>>([]);
  const [revenue, setRevenue] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        getDashboardAnalytics(),
        getHealthScores(),
        getAlerts(),
        getTopTenants(10, 'bookings'),
        getRevenueAnalytics(12),
      ]);
      const [dashRes, healthRes, alertsRes, topRes, revRes] = results;
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data?.data ?? dashRes.value.data ?? dashRes.value);
      if (healthRes.status === 'fulfilled') setHealthScores(extractList(healthRes.value));
      if (alertsRes.status === 'fulfilled') setAlerts(extractList(alertsRes.value));
      if (topRes.status === 'fulfilled') setTopTenants(extractList(topRes.value));
      if (revRes.status === 'fulfilled') setRevenue(extractList(revRes.value));
      setLoading(false);
    };
    load();
  }, []);

  const d = dashboard || {};

  const revenueLast = revenue.length >= 2 ? revenue[revenue.length - 1] : null;
  const revenuePrev = revenue.length >= 2 ? revenue[revenue.length - 2] : null;
  const revenueTrend = revenuePrev && Number(revenuePrev.revenue) > 0
    ? Math.round(((Number(revenueLast?.revenue || 0) - Number(revenuePrev.revenue)) / Number(revenuePrev.revenue)) * 100)
    : 0;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ margin: '0 auto 16px', width: 36, height: 36, border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-primary-500)', borderRadius: '50%', animation: 'ds-spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--ds-text-secondary)' }}>Cargando panel...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sa-page-header">
        <div>
          <h2>Panel Super Administrador</h2>
          <p>Vision general de la plataforma — {d.active_tenants || 0} clinicas activas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/super-admin/analytics"><Button variant="outline" size="sm">Ver Analiticas</Button></Link>
          <Link to="/super-admin/tenants?new=1" onClick={(e) => { e.preventDefault(); window.location.href = '/super-admin/tenants'; }}>
            <Button variant="primary" size="sm">+ Nueva Clinica</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sa-stats-grid">
        <KpiCard label="Clinicas Activas" value={d.active_tenants ?? 0} icon="🏢" colorClass="teal" />
        <KpiCard label="Usuarios Totales" value={Number(d.active_patients ?? 0).toLocaleString()} icon="👥" colorClass="blue" />
        <KpiCard label="Doctores" value={d.confirmed_doctors ?? 0} icon="🩺" colorClass="green" />
        <KpiCard label="Ingresos Mensuales" value={`$${Number(revenueLast?.revenue || d.mrr || 0).toLocaleString()}`} icon="💰" colorClass="orange" delta={revenueTrend} />
      </div>

      {/* Two-column layout: Alerts + Top Clinics */}
      <div className="sa-grid-2">
        {/* Alerts */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div>
              <h2>Alertas</h2>
              <p style={{ fontSize: 12, color: 'var(--ds-text-secondary)', margin: '2px 0 0' }}>
                {alerts.length} alertas activas
              </p>
            </div>
            <Link to="/super-admin/analytics">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </div>
          <div className="sa-card-body">
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.slice(0, 5).map((alert, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--ds-surface-hover)', border: '1px solid var(--ds-border)',
                  }}>
                    <AlertBadge severity={alert.severity} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 13, display: 'block' }}>{alert.tenant_name}</strong>
                      <span style={{ color: 'var(--ds-text-secondary)', fontSize: 12 }}>{alert.message}</span>
                    </div>
                    <Link to={`/super-admin/tenants/${alert.tenant_id}`} style={{ flexShrink: 0 }}>
                      <Button variant="outline" size="sm">Ir</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <span style={{ fontSize: 28 }}>✅</span>
                <p style={{ color: 'var(--ds-text-tertiary)', marginTop: 8, fontSize: 13 }}>Todas las clinicas saludables</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Clinics */}
        <div className="sa-card">
          <div className="sa-card-header">
            <div>
              <h2>Top Clinicas</h2>
              <p style={{ fontSize: 12, color: 'var(--ds-text-secondary)', margin: '2px 0 0' }}>Por cantidad de citas</p>
            </div>
            <Link to="/super-admin/tenants">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </div>
          <div className="sa-card-body">
            {topTenants.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {topTenants.slice(0, 5).map((tenant, i) => {
                  const health = healthScores.find((h) => h.id === tenant.id);
                  const score = health?.health_score ?? 0;
                  const getScoreColor = (s: number) => s >= 80 ? 'var(--ds-success-500)' : s >= 50 ? '#fbbf24' : '#fb923c';
                  const initials = (tenant.name || '').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={tenant.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8,
                      background: 'var(--ds-surface-hover)', border: '1px solid var(--ds-border)',
                      cursor: 'pointer',
                    }} onClick={() => window.location.href = `/super-admin/tenants/${tenant.id}`}>
                      <div style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', width: 16, textAlign: 'center' }}>{i + 1}</div>
                      <div className="sa-tenant-logo" style={{ width: 32, height: 32, fontSize: 12, background: `linear-gradient(135deg, var(--ds-primary-500), var(--ds-primary-700))` }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ds-text-secondary)' }}>{tenant.total_bookings ?? 0} citas</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: getScoreColor(score) }}>{score}</div>
                        <div style={{ fontSize: 10, color: 'var(--ds-text-tertiary)' }}>salud</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 30 }}>No hay clinicas</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions bar */}
      <div className="sa-card" style={{ marginTop: 20 }}>
        <div className="sa-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>
            Accesos rapidos
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/super-admin/tenants"><Button variant="outline" size="sm">🏢 Gestionar Clinicas</Button></Link>
            <Link to="/super-admin/users"><Button variant="outline" size="sm">👥 Gestionar Usuarios</Button></Link>
            <Link to="/super-admin/analytics"><Button variant="outline" size="sm">📈 Ver Analiticas</Button></Link>
            <Link to="/super-admin/demo-data"><Button variant="outline" size="sm">🎯 Datos Demo</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
