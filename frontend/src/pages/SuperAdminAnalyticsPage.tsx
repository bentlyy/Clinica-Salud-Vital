import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  getRevenueAnalytics, getGrowthAnalytics, getChurn,
  getOperations, getComparison, getOccupancy, getTopTenants
} from '../api/super-admin';
import { extractList } from '../utils/extract-list';
import Button from '../components/ui/Button';
import './superadmin-theme.css';

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Tab = 'overview' | 'revenue' | 'growth' | 'operations' | 'comparison';

export default function SuperAdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<Array<Record<string, unknown>>>([]);
  const [growth, setGrowth] = useState<Array<Record<string, unknown>>>([]);
  const [churn, setChurn] = useState<Record<string, unknown> | null>(null);
  const [operations, setOperations] = useState<Record<string, unknown> | null>(null);
  const [comparison, setComparison] = useState<Array<Record<string, unknown>>>([]);
  const [occupancy, setOccupancy] = useState<Array<Record<string, unknown>>>([]);
  const [topTenants, setTopTenants] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        getRevenueAnalytics(12),
        getGrowthAnalytics(12),
        getChurn(12),
        getOperations(6),
        getComparison(),
        getOccupancy(),
        getTopTenants(20, 'bookings'),
      ]);
      const [revRes, growRes, churnRes, opsRes, compRes, occRes, topRes] = results;
      if (revRes.status === 'fulfilled') setRevenue(extractList(revRes.value));
      if (growRes.status === 'fulfilled') setGrowth(extractList(growRes.value));
      if (churnRes.status === 'fulfilled') setChurn(churnRes.value.data?.data ?? churnRes.value.data ?? churnRes.value);
      if (opsRes.status === 'fulfilled') setOperations(opsRes.value.data?.data ?? opsRes.value.data ?? opsRes.value);
      if (compRes.status === 'fulfilled') setComparison(extractList(compRes.value));
      if (occRes.status === 'fulfilled') setOccupancy(extractList(occRes.value));
      if (topRes.status === 'fulfilled') setTopTenants(extractList(topRes.value));
      setLoading(false);
    };
    load();
  }, []);

  const d = churn || {};
  const ops = operations || {};

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Resumen' },
    { key: 'revenue', label: 'Ingresos' },
    { key: 'growth', label: 'Crecimiento' },
    { key: 'operations', label: 'Operación' },
    { key: 'comparison', label: 'Comparación' },
  ];

  const formatMonth = (m: string) => {
    if (!m) return m;
    const p = m.split('-');
    return months[parseInt(p[1]) - 1] || m;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ margin: '0 auto 16px', width: 36, height: 36, border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-primary-500)', borderRadius: '50%', animation: 'ds-spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--ds-text-secondary)' }}>Cargando analíticas...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sa-page-header">
        <div>
          <h2>Analíticas de la Plataforma</h2>
          <p>Métricas globales de todas las clínicas</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon teal">💰</div>
          </div>
          <div className="sa-stat-card-value">${Number(d.mrr || 0).toLocaleString()}</div>
          <div className="sa-stat-card-label">MRR (Ingresos Mensuales)</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon blue">📈</div>
          </div>
          <div className="sa-stat-card-value">${Number(d.arr || 0).toLocaleString()}</div>
          <div className="sa-stat-card-label">ARR (Ingresos Anuales)</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon orange">📊</div>
          </div>
          <div className="sa-stat-card-value" style={{ color: d.churn_rate > 5 ? '#ef4444' : 'var(--ds-success-500)' }}>
            {d.churn_rate || 0}%
          </div>
          <div className="sa-stat-card-label">Churn mensual</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-card-header">
            <div className="sa-stat-card-icon green">🔄</div>
          </div>
          <div className="sa-stat-card-value">{d.annual_retention || 0}%</div>
          <div className="sa-stat-card-label">Retención anual</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid var(--ds-border)',
        overflowX: 'auto', flexWrap: 'nowrap',
      }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 'var(--ds-text-sm)', fontWeight: activeTab === tab.key ? 'var(--ds-font-semibold)' : 'var(--ds-font-normal)',
              color: activeTab === tab.key ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--ds-primary-500)' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap', transition: 'color 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW === */}
      {activeTab === 'overview' && (
        <>
          <div className="sa-grid-2 sa-mb-28">
            <div className="sa-card">
              <div className="sa-card-header">
                <h2>Evolución MRR</h2>
              </div>
              <div className="sa-card-body">
                {revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={formatMonth} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} />
                      <Area type="monotone" dataKey="revenue" stroke="var(--ds-success-500, #22c55e)" fill="var(--ds-success-500, #22c55e)" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos</p>
                )}
              </div>
            </div>

            <div className="sa-card">
              <div className="sa-card-header">
                <h2>Crecimiento de Usuarios</h2>
              </div>
              <div className="sa-card-body">
                {growth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={formatMonth} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                      <Tooltip />
                      <Bar dataKey="new_users" fill="var(--ds-primary-500, #8b5cf6)" name="Nuevos usuarios" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="new_tenants" fill="var(--ds-info-500, #3b82f6)" name="Nuevos tenants" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Clinics */}
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Top Clínicas por Citas</h2>
            </div>
            <div className="sa-card-body">
              {topTenants.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topTenants.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                    <Tooltip />
                    <Bar dataKey="total_bookings" fill="var(--ds-primary-500, #8b5cf6)" name="Citas" radius={[4, 4, 0, 0]}>
                      {topTenants.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={`hsl(${200 + i * 15}, 60%, ${55 - i * 2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* === REVENUE === */}
      {activeTab === 'revenue' && (
        <>
          <div className="sa-card sa-mb-28">
            <div className="sa-card-header">
              <h2>Evolución de Ingresos — Últimos 12 meses</h2>
            </div>
            <div className="sa-card-body">
              {revenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={formatMonth} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--ds-success-500, #22c55e)" fill="var(--ds-success-500, #22c55e)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos de ingresos</p>
              )}
            </div>
          </div>

          <div className="sa-stats-grid">
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ textAlign: 'center' }}>
                ${Number(d.mrr || 0).toLocaleString()}
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>MRR Actual</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: 'var(--ds-info-500)', textAlign: 'center' }}>
                ${Number(d.arr || 0).toLocaleString()}
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>ARR Proyectado</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: d.churn_rate > 5 ? '#ef4444' : 'var(--ds-success-500)', textAlign: 'center' }}>
                {d.churn_rate || 0}%
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Churn Rate</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: 'var(--ds-primary-500)', textAlign: 'center' }}>
                {d.annual_retention || 0}%
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Retención Anual</div>
            </div>
          </div>

          {/* Revenue bar list */}
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Ingresos por Mes</h2>
            </div>
            <div className="sa-card-body">
              <div className="sa-revenue-bars">
                {revenue.length > 0 ? revenue.map((rev, i) => {
                  const maxRev = Math.max(...revenue.map(r => Number(r.revenue || 0)));
                  const pct = maxRev > 0 ? (Number(rev.revenue || 0) / maxRev) * 100 : 0;
                  const colors = ['', 'blue', 'purple', 'orange'];
                  return (
                    <div key={i} className="sa-revenue-bar-item">
                      <div className="sa-revenue-bar-label">
                        <span>{formatMonth(String(rev.month || ''))}</span>
                        <span>${Number(rev.revenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="sa-revenue-bar-track">
                        <div className={`sa-revenue-bar-fill ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* === GROWTH === */}
      {activeTab === 'growth' && (
        <>
          <div className="sa-card sa-mb-28">
            <div className="sa-card-header">
              <h2>Crecimiento Mensual</h2>
              <p style={{ fontSize: 12, color: 'var(--ds-text-secondary)' }}>Nuevos tenants, usuarios y reservas</p>
            </div>
            <div className="sa-card-body">
              {growth.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={formatMonth} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="new_tenants" fill="var(--ds-info-500, #3b82f6)" name="Nuevos tenants" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="new_users" fill="var(--ds-primary-500, #8b5cf6)" name="Nuevos usuarios" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="new_bookings" fill="var(--ds-success-500, #22c55e)" name="Nuevas reservas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos de crecimiento</p>
              )}
            </div>
          </div>

          <div className="sa-stats-grid">
            {growth.length > 0 && (
              <>
                <div className="sa-stat-card">
                  <div className="sa-stat-card-value" style={{ textAlign: 'center' }}>
                    {growth[growth.length - 1]?.new_tenants || 0}
                  </div>
                  <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Nuevos tenants (mes actual)</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-card-value" style={{ textAlign: 'center' }}>
                    {growth[growth.length - 1]?.new_users || 0}
                  </div>
                  <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Nuevos usuarios (mes actual)</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-card-value" style={{ textAlign: 'center' }}>
                    {growth[growth.length - 1]?.new_bookings || 0}
                  </div>
                  <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Nuevas reservas (mes actual)</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-card-value" style={{ textAlign: 'center' }}>
                    {growth.reduce((sum: number, g) => sum + Number(g.new_tenants || 0), 0)}
                  </div>
                  <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Total tenants (12 meses)</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* === OPERATIONS === */}
      {activeTab === 'operations' && (
        <>
          <div className="sa-stats-grid">
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: 'var(--ds-success-500)', textAlign: 'center' }}>
                {ops.cancellation_rate || 0}%
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Tasa cancelación</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: 'var(--ds-primary-500)', textAlign: 'center' }}>
                {ops.no_show_rate || 0}%
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>No-show rate</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: 'var(--ds-info-500)', textAlign: 'center' }}>
                {ops.avg_lead_days || 0}
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Días prom. reserva→atención</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-card-value" style={{ color: 'var(--ds-warning-500)', textAlign: 'center' }}>
                {ops.total_bookings_period || 0}
              </div>
              <div className="sa-stat-card-label" style={{ textAlign: 'center' }}>Citas (últimos 6m)</div>
            </div>
          </div>

          <div className="sa-grid-2">
            <div className="sa-card">
              <div className="sa-card-header">
                <h2>Especialidades más usadas</h2>
              </div>
              <div className="sa-card-body">
                {ops.specialties?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ops.specialties.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="var(--ds-info-500, #3b82f6)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos</p>
                )}
              </div>
            </div>

            <div className="sa-card">
              <div className="sa-card-header">
                <h2>Top 10 Médicos por citas</h2>
              </div>
              <div className="sa-card-body">
                {ops.top_doctors?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ops.top_doctors} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                      <Tooltip />
                      <Bar dataKey="total_bookings" fill="var(--ds-primary-500, #8b5cf6)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos</p>
                )}
              </div>
            </div>
          </div>

          {/* Hourly demand */}
          {ops.hourly_demand?.length > 0 && (
            <div className="sa-card" style={{ marginTop: 20 }}>
              <div className="sa-card-header">
                <h2>Demanda por Hora del Día</h2>
              </div>
              <div className="sa-card-body">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ops.hourly_demand}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--ds-warning-500, #eab308)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* === COMPARISON === */}
      {activeTab === 'comparison' && (
        <>
          {/* Occupancy chart */}
          {occupancy.length > 0 && (
            <div className="sa-card sa-mb-28">
              <div className="sa-card-header">
                <h2>Ocupación de Doctores por Clínica</h2>
              </div>
              <div className="sa-card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={occupancy}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                    <XAxis dataKey="tenant_name" tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--ds-text-secondary)' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Ocupación']} />
                    <Bar dataKey="occupancy_rate" name="Tasa de ocupación" radius={[4, 4, 0, 0]}>
                      {occupancy.map((entry, i) => (
                        <Cell key={i} fill={Number(entry.occupancy_rate) > 80 ? 'var(--ds-success-500)' : Number(entry.occupancy_rate) > 50 ? 'var(--ds-warning-500)' : 'var(--ds-danger-500)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Full comparison table */}
          <div className="sa-card">
            <div className="sa-card-header">
              <h2>Comparativa Completa de Clínicas</h2>
            </div>
            <div className="sa-card-body">
              {comparison.length > 0 ? (
                <div className="sa-table-container">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Clínica</th>
                        <th>Usuarios</th>
                        <th>Doctores</th>
                        <th>Citas</th>
                        <th>Ingresos</th>
                        <th>Salud</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((row) => {
                        const score = Number(row.health_score || 0);
                        const getScoreColor = (s: number) => s >= 80 ? 'var(--ds-success-500)' : s >= 50 ? '#fbbf24' : s >= 20 ? '#fb923c' : '#ef4444';
                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="sa-tenant-name-cell">
                                <div className="sa-tenant-logo" style={{ background: 'linear-gradient(135deg, var(--ds-primary-500), var(--ds-primary-700))' }}>
                                  {(row.name || '').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="sa-tenant-name-text">
                                  <strong>{row.name}</strong>
                                  {!row.active && <span style={{ color: '#ef4444' }}>(inactiva)</span>}
                                </div>
                              </div>
                            </td>
                            <td>{row.total_users ?? 0}</td>
                            <td>{row.total_doctors ?? 0}</td>
                            <td>{row.total_bookings ?? 0}</td>
                            <td>${Number(row.metric_value ?? 0).toLocaleString()}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: getScoreColor(score) }}>{score}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 40 }}>Sin datos de comparación</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
