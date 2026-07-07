import { useState, useEffect, useCallback } from 'react';
import type { LabQCRecord } from '../../types';
import { getQCRecords, getQCStatistics } from '../../api/laboratory.api';
import QCLeveyJennings from './QCLeveyJennings';

interface QCDashboardProps {
  areaId?: number;
}

export default function QCDashboard({ areaId }: QCDashboardProps) {
  const [records, setRecords] = useState<LabQCRecord[]>([]);
  const [stats, setStats] = useState<{ total: number; passed: number; failed: number; warning: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsData, statsData] = await Promise.all([
        getQCRecords(areaId ? { area_id: areaId } : {}),
        getQCStatistics(areaId),
      ]);
      setRecords(recordsData);
      setStats(statsData);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [areaId]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Cargando control de calidad...</p>;

  const passedRate = stats ? ((stats.passed / stats.total) * 100).toFixed(1) : '0';
  const failedRate = stats ? ((stats.failed / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>🔬 Control de Calidad</h3>
        <button onClick={fetch} className="btn btn-ghost btn-sm">Refrescar</button>
      </div>

      {stats && (
        <div className="grid grid-3" style={{ gap: 12, marginBottom: 16 }}>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>Aprobados</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '2px 0 0' }}>{stats.passed}</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 11, color: '#991b1b', margin: 0 }}>Fallidos</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', margin: '2px 0 0' }}>{stats.failed}</p>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: 11, color: '#92400e', margin: 0 }}>Advertencias</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#d97706', margin: '2px 0 0' }}>{stats.warning}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
          <div style={{
            width: `${passedRate}%`, height: '100%', borderRadius: 4,
            background: '#22c55e', transition: 'width 0.3s',
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{passedRate}%</span>
      </div>

      <QCLeveyJennings records={records} />

      {records.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Control</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Lote</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Medido</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Esperado</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '6px 8px' }}>{r.control_name}</td>
                  <td style={{ padding: '6px 8px' }}>{r.lot_number}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.measured_value}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    {r.expected_min} – {r.expected_max}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 8px', borderRadius: 8,
                      fontSize: 11, fontWeight: 600,
                      background: r.status === 'passed' ? '#d1fae5' : r.status === 'failed' ? '#fef2f2' : '#fffbeb',
                      color: r.status === 'passed' ? '#065f46' : r.status === 'failed' ? '#991b1b' : '#92400e',
                    }}>
                      {r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⚠️'} {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
