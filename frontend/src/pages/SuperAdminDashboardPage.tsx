import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line, Legend, Cell
} from 'recharts';
import {
  getDashboardAnalytics, getTopTenants, getRevenueAnalytics,
  getGrowthAnalytics, getHealthScores, getOperations,
  getChurn, getAlerts
} from '../api/super-admin';
import { extractList } from '../utils/extract-list';
import { useI18n } from '../i18n/useI18n';

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function KpiCard({ label, value, delta, icon, color }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {delta !== undefined && (
        <div style={{ fontSize: 12, color: delta >= 0 ? 'var(--chart-green)' : 'var(--chart-red)' }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs mes anterior
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children, style }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 20, ...style }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function HealthBar({ score }) {
  const getColor = (s) => {
    if (s >= 80) return 'var(--chart-green)';
    if (s >= 50) return '#fbbf24';
    if (s >= 20) return '#fb923c';
    return '#ef4444';
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: getColor(score), borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: getColor(score), minWidth: 28, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

function AlertBadge({ severity }) {
  const config = {
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
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState('resumen');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [healthScores, setHealthScores] = useState([]);
  const [operations, setOperations] = useState(null);
  const [churn, setChurn] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [topTenants, setTopTenants] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [revenue, setRevenue] = useState([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        getDashboardAnalytics(),
        getHealthScores(),
        getOperations(6),
        getChurn(12),
        getAlerts(),
        getTopTenants(20, 'bookings'),
        getGrowthAnalytics(12),
        getRevenueAnalytics(12),
      ]);

      const [dashRes, healthRes, opsRes, churnRes, alertsRes, topRes, growRes, revRes] = results;

      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data?.data ?? dashRes.value.data ?? dashRes.value);
      if (healthRes.status === 'fulfilled') setHealthScores(extractList(healthRes.value));
      if (opsRes.status === 'fulfilled') setOperations(opsRes.value.data?.data ?? opsRes.value.data ?? opsRes.value);
      if (churnRes.status === 'fulfilled') setChurn(churnRes.value.data?.data ?? churnRes.value.data ?? churnRes.value);
      if (alertsRes.status === 'fulfilled') setAlerts(extractList(alertsRes.value));
      if (topRes.status === 'fulfilled') setTopTenants(extractList(topRes.value));
      if (growRes.status === 'fulfilled') setGrowth(extractList(growRes.value));
      if (revRes.status === 'fulfilled') setRevenue(extractList(revRes.value));

      setLoading(false);
    };
    load();
  }, []);

  const d = dashboard || {};
  const churnData = churn || {};
  const ops = operations || {};

  const revenueLast = revenue.length >= 2 ? revenue[revenue.length - 1] : null;
  const revenuePrev = revenue.length >= 2 ? revenue[revenue.length - 2] : null;

  // Crecimiento mensual de tenants
  const prevMonthTenants = growth.length >= 2 ? growth[growth.length - 2]?.new_tenants || 0 : 0;
  const currMonthTenants = growth.length >= 1 ? growth[growth.length - 1]?.new_tenants || 0 : 0;
  const growthPct = prevMonthTenants > 0 ? Math.round(((currMonthTenants - prevMonthTenants) / prevMonthTenants) * 100) : 0;

  // Merge growth + revenue para composed chart
  const combinedGrowth = growth.map((g, i) => ({
    ...g,
    revenue: revenue[i]?.revenue ? Number(revenue[i].revenue) : undefined,
  }));

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const sections = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'clinicas', label: 'Clínicas' },
    { key: 'salud', label: 'Salud' },
    { key: 'alertas', label: `Alertas${alerts.length ? ` (${alerts.length})` : ''}` },
    { key: 'operacion', label: 'Operación' },
    { key: 'facturacion', label: 'Facturación' },
  ];

  return (
    <div className="page-container-wide" style={{ padding: '24px 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Panel de Control</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0', fontSize: 13 }}>
            Visión general de la plataforma SaaS — {d.active_tenants || 0} clínicas activas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/super-admin/tenants" className="btn btn--outline btn--sm">Gestionar Clínicas</Link>
          <Link to="/super-admin/tenants?new=1" className="btn btn--primary btn--sm"
            onClick={(e) => { e.preventDefault(); window.location.href = '/super-admin/tenants'; }}>
            + Nueva Clínica
          </Link>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid var(--border-light)',
        overflowX: 'auto', flexWrap: 'nowrap',
      }}>
        {sections.map((s) => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeSection === s.key ? 600 : 400,
              color: activeSection === s.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeSection === s.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* === SECCIÓN: RESUMEN === */}
      {activeSection === 'resumen' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiCard label="Clínicas activas" value={d.active_tenants ?? 0} icon="🏢" color="var(--chart-blue)"
              delta={growthPct} />
            <KpiCard label="Nuevas este mes" value={d.new_tenants_this_month ?? 0} icon="✨" color="var(--chart-green)" />
            <KpiCard label="Pacientes activos" value={d.active_patients ?? 0} icon="👥" color="var(--chart-purple)" />
            <KpiCard label="Citas realizadas" value={d.confirmed_bookings ?? 0} icon="📅" color="var(--chart-orange)"
              delta={(() => {
                const g = growth;
                if (g.length < 2) return undefined;
                const curr = g[g.length - 1]?.new_bookings || 0;
                const prev = g[g.length - 2]?.new_bookings || 0;
                return prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
              })()} />
            <KpiCard label="MRR" value={`$${Number(d.mrr || 0).toLocaleString()}`} icon="💰" color="var(--chart-green)"
              delta={(() => {
                if (!revenueLast || !revenuePrev) return undefined;
                const curr = Number(revenueLast.revenue || 0);
                const prev = Number(revenuePrev.revenue || 0);
                return prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
              })()} />
            <KpiCard label="Retención anual" value={churnData.annual_retention != null ? `${churnData.annual_retention}%` : '—'}
              icon="🛡️" color="var(--chart-teal, #14b8a6)" />
          </div>

          {/* Gráfico mixto: Crecimiento SaaS */}
          <SectionCard title="Crecimiento Global" subtitle="Nuevos tenants, pacientes activos e ingresos mensuales">
            {combinedGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={combinedGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickFormatter={(m) => { const p = m.split('-'); return months[parseInt(p[1]) - 1] || m; }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickFormatter={(v) => `$${v}`} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="new_tenants" fill="var(--chart-blue)" name="Nuevos tenants" radius={[2, 2, 0, 0]} />
                  <Area yAxisId="left" dataKey="new_users" fill="var(--chart-purple)" stroke="var(--chart-purple)"
                    fillOpacity={0.1} name="Nuevos usuarios" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="var(--chart-green)" strokeWidth={2}
                    name="Ingresos ($)" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos de crecimiento</p>
            )}
          </SectionCard>
        </>
      )}

      {/* === SECCIÓN: CLÍNICAS === */}
      {activeSection === 'clinicas' && (
        <SectionCard title="Comparativa de Clínicas"
          subtitle="Ranking completo con métricas clave y Health Score">
          {topTenants.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>Clínica</th>
                    <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 600 }}>Pacientes</th>
                    <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 600 }}>Citas</th>
                    <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 600 }}>Ingresos</th>
                    <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 600 }}>Salud</th>
                  </tr>
                </thead>
                <tbody>
                  {topTenants.slice(0, 20).map((tenant, i) => {
                    const health = healthScores.find((h) => h.id === tenant.id);
                    const score = health?.health_score ?? 0;
                    const getScoreColor = (s) => s >= 80 ? 'var(--chart-green)' : s >= 50 ? '#fbbf24' : s >= 20 ? '#fb923c' : '#ef4444';
                    return (
                      <tr key={tenant.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                        onClick={() => window.location.href = `/super-admin/tenants/${tenant.id}`}>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 500 }}>
                          {tenant.name}
                          {!tenant.active && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444' }}>(inactiva)</span>}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{tenant.total_users ?? 0}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{tenant.total_bookings ?? 0}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          ${Number(tenant.metric_value ?? 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: getScoreColor(score) }}>{score}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No hay clínicas registradas</p>
          )}
        </SectionCard>
      )}

      {/* === SECCIÓN: SALUD === */}
      {activeSection === 'salud' && (
        <SectionCard title="Estado de Salud por Clínica"
          subtitle="Health Score basado en actividad, tendencia, pacientes, cancelaciones y módulos usados — escala 0 a 100">
          <details style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <summary style={{ fontWeight: 500 }}>¿Cómo se calcula?</summary>
            <p style={{ marginTop: 8, lineHeight: 1.6 }}>
              Cada clínica recibe un puntaje de 0 a 100 basado en 5 factores con igual peso (20 pts c/u):
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 4, lineHeight: 1.8 }}>
              <li><strong>Actividad</strong> — días desde la última reserva. A más días, menor puntaje.</li>
              <li><strong>Tendencia</strong> — compara reservas del último mes vs el mes anterior.</li>
              <li><strong>Pacientes</strong> — cantidad de pacientes distintos en los últimos 30 días.</li>
              <li><strong>Cancelaciones</strong> — tasa de cancelación sobre el total de reservas.</li>
              <li><strong>Módulos</strong> — cuántos módulos usa la clínica (historias, laboratorio, reservas, facturación).</li>
            </ul>
            <p style={{ marginTop: 4 }}>Rangos: <strong style={{ color: 'var(--chart-green)' }}>Saludable</strong> (80-100) · <strong style={{ color: '#fbbf24' }}>Atención</strong> (50-79) · <strong style={{ color: '#fb923c' }}>Riesgo</strong> (20-49) · <strong style={{ color: '#ef4444' }}>Crítico</strong> (&lt;20)</p>
          </details>
          {healthScores.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {healthScores.map((h) => {
                const score = Number(h.health_score ?? 0);
                const getColor = (s) => s >= 80 ? 'var(--chart-green)' : s >= 50 ? '#fbbf24' : s >= 20 ? '#fb923c' : '#ef4444';
                const getLabel = (s) => s >= 80 ? 'Saludable' : s >= 50 ? 'Atención' : s >= 20 ? 'Riesgo' : 'Crítico';
                return (
                  <div key={h.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                  }}>
                    <div style={{ flex: '0 0 160px', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.name}
                    </div>
                    <div style={{ flex: 1 }}>
                      <HealthBar score={score} />
                    </div>
                    <div style={{ flex: '0 0 60px', textAlign: 'center', fontSize: 11, color: getColor(score), fontWeight: 600 }}>
                      {getLabel(score)}
                    </div>
                    <Link to={`/super-admin/tenants/${h.id}`} className="btn btn--outline btn--sm"
                      style={{ flexShrink: 0 }}>Ver</Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No hay datos de salud</p>
          )}
        </SectionCard>
      )}

      {/* === SECCIÓN: ALERTAS === */}
      {activeSection === 'alertas' && (
        <SectionCard title="Alertas Inteligentes" subtitle="Detectadas automáticamente según actividad de cada clínica">
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.slice(0, 20).map((alert, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                }}>
                  <AlertBadge severity={alert.severity} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{alert.tenant_name}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8 }}>{alert.message}</span>
                  </div>
                  <Link to={`/super-admin/tenants/${alert.tenant_id}`} className="btn btn--outline btn--sm">Ir</Link>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <span style={{ fontSize: 32 }}>✅</span>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No hay alertas activas — todas las clínicas están saludables</p>
            </div>
          )}
        </SectionCard>
      )}

      {/* === SECCIÓN: OPERACIÓN === */}
      {activeSection === 'operacion' && (
        <>
          {/* Métricas operativas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-green)' }}>{ops.cancellation_rate || 0}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tasa cancelación</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-purple)' }}>{ops.no_show_rate || 0}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>No-show rate</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-blue)' }}>{ops.avg_lead_days || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Días prom. reserva→atención</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--chart-orange)' }}>{ops.total_bookings_period || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Citas (últimos 6m)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SectionCard title="Especialidades más usadas">
              {ops.specialties?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ops.specialties.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="var(--chart-blue)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos</p>
              )}
            </SectionCard>

            <SectionCard title="Top 10 Médicos por citas">
              {ops.top_doctors?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ops.top_doctors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip />
                    <Bar dataKey="total_bookings" fill="var(--chart-purple)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos</p>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* === SECCIÓN: FACTURACIÓN === */}
      {activeSection === 'facturacion' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--chart-green)' }}>
                ${Number(churnData.mrr || d.mrr || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>MRR</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--chart-blue)' }}>
                ${Number(churnData.arr || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ARR</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: churnData.churn_rate > 5 ? '#ef4444' : 'var(--chart-green)' }}>
                {churnData.churn_rate || 0}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Churn mensual</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--chart-purple)' }}>
                {churnData.annual_retention || 0}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Retención anual</div>
            </div>
          </div>

          <SectionCard title="Evolución MRR" subtitle="Ingresos mensuales recurrentes últimos 12 meses">
            {revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickFormatter={(m) => { const p = m.split('-'); return months[parseInt(p[1]) - 1] || m; }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-green)" fill="var(--chart-green)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Sin datos financieros</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
