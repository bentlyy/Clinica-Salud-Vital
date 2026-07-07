import { useState, useEffect, useCallback } from 'react';
import type { LabReagent } from '../../types';
import { getReagents, updateReagentStock } from '../../api/laboratory.api';

export default function ReagentStockTable() {
  const [reagents, setReagents] = useState<LabReagent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReagents();
      setReagents(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdjustStock = async (id: number, quantity: number) => {
    try {
      const updated = await updateReagentStock(id, quantity);
      setReagents(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch { /* silent */ }
  };

  const lowStock = reagents.filter(r => r.current_stock <= r.min_stock);

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>🧪 Reactivos e Insumos</h3>
        <button onClick={fetch} className="btn btn-ghost btn-sm">Refrescar</button>
      </div>

      {lowStock.length > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 12,
          background: '#fef2f2', border: '1px solid #fecaca',
        }}>
          <strong style={{ fontSize: 12, color: '#dc2626' }}>
            ⚠️ {lowStock.length} reactivo(s) con stock bajo
          </strong>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : reagents.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin reactivos registrados</p>
      ) : (
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Nombre</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Lote</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Stock</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Mínimo</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Vencimiento</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reagents.map((r) => {
              const isLow = r.current_stock <= r.min_stock;
              const isExpired = r.expiration_date && new Date(r.expiration_date) < new Date();
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{r.lot_number || '—'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: isLow ? '#dc2626' : undefined }}>
                    {r.current_stock} {r.unit}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {r.min_stock}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: isExpired ? '#dc2626' : 'var(--text-secondary)' }}>
                    {r.expiration_date ? new Date(r.expiration_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: isExpired ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e',
                    }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
