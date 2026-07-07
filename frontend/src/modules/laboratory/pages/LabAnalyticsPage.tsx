import { useState, useEffect, useCallback } from 'react';
import type { LabAnalyticsData } from '../types';
import { getAnalyticsData } from '../api/laboratory.api';
import { useLabKeyboard } from '../hooks/useLabKeyboard';

export default function LabAnalyticsPage() {
  const [data, setData] = useState<LabAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAnalyticsData();
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useLabKeyboard([
    { key: 'r', ctrl: true, handler: fetch, description: 'Refrescar' },
  ]);

  if (loading) return <div className="page-container"><p style={{ color: 'var(--text-muted)' }}>Cargando analítica...</p></div>;
  if (!data) return <div className="page-container"><p>Error al cargar datos analíticos</p></div>;

  const periodData = period === 'daily' ? data.daily : period === 'weekly' ? data.weekly : data.monthly;

  return (
    <div className="page-container-wide">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            📊
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Analítica</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Métricas y estadísticas del laboratorio
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
            >
              {p === 'daily' ? 'Diario' : p === 'weekly' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-4" style={{ gap: 14, marginBottom: 24 }}>
        <MetricCard label="Tiempo promedio" value={`${data.avg_processing_time} min`} color="#06b6d4" />
        <MetricCard label="Tasa de repetición" value={`${(data.repeat_rate * 100).toFixed(1)}%`} color={data.repeat_rate > 0.05 ? '#f59e0b' : '#22c55e'} />
        <MetricCard label="Cumplimiento SLA" value={`${(data.sla_compliance * 100).toFixed(0)}%`} color={data.sla_compliance > 0.95 ? '#22c55e' : '#ef4444'} />
        <MetricCard label="Ingresos" value={`$${data.total_revenue.toLocaleString()}`} color="#22c55e" />
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Exámenes por período ({period === 'daily' ? 'día' : period === 'weekly' ? 'semana' : 'mes'})
          </h3>
          {periodData.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, padding: '8px 0' }}>
              {periodData.slice(-14).map((d, i) => {
                const maxCount = Math.max(...periodData.map(x => x.count), 1);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: '100%', height: `${(d.count / maxCount) * 100}%`,
                      background: `linear-gradient(180deg, #06b6d4, #0891b2)`,
                      borderRadius: '3px 3px 0 0',
                      minHeight: 4,
                      opacity: d.completed / d.count,
                    }} />
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                      {d.date?.slice(5, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Por médico solicitante</h3>
          {data.by_doctor.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.by_doctor.slice(0, 8).map((d, i) => {
                const maxCount = Math.max(...data.by_doctor.map(x => x.count), 1);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{d.doctor_name}</span>
                      <span style={{ fontWeight: 600 }}>{d.count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(d.count / maxCount) * 100}%`, height: '100%', borderRadius: 3,
                        background: '#8b5cf6', transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⏱ Tiempo promedio por área</h3>
          {data.by_area.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin datos</p>
          ) : (
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Área</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Exámenes</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Tiempo prom.</th>
                </tr>
              </thead>
              <tbody>
                {data.by_area.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '6px 10px' }}>{a.area_name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{a.count}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {Math.round(a.avg_time_min)} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📈 Exámenes más solicitados</h3>
          {data.top_tests.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.top_tests.slice(0, 8).map((t, i) => {
                const maxCount = Math.max(...data.top_tests.map(x => x.count), 1);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.test_name}</span>
                      <span style={{ fontWeight: 600 }}>{t.count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(t.count / maxCount) * 100}%`, height: '100%', borderRadius: 3,
                        background: '#06b6d4', transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}
