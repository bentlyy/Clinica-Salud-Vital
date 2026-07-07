import type { LabRequest } from '../../types';
import { LAB_STATUS_LABELS } from '../../types';
import LabCard from '../shared/LabCard';

interface DashboardWorkQueueProps {
  requests: LabRequest[];
  onSelectRequest: (request: LabRequest) => void;
  loading?: boolean;
}

const QUEUE_COLUMNS = [
  { key: 'pending', label: 'Pendientes', color: '#f59e0b' },
  { key: 'received', label: 'Recibidas', color: '#3b82f6' },
  { key: 'processing', label: 'En Proceso', color: '#f97316' },
  { key: 'validated_tech', label: 'Validación', color: '#8b5cf6' },
  { key: 'delivered', label: 'Entregadas', color: '#22c55e' },
];

export default function DashboardWorkQueue({ requests, onSelectRequest, loading }: DashboardWorkQueueProps) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 8 }}>
        {QUEUE_COLUMNS.map((col) => {
          const items = requests.filter(r => r.status === col.key);
          return (
            <div key={col.key} style={{ minWidth: 280, maxWidth: 320, flex: 1 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', marginBottom: 8,
                background: `${col.color}08`,
                borderRadius: 8, border: `1px solid ${col.color}20`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <strong style={{ fontSize: 13, color: col.color }}>{col.label}</strong>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#fff', background: col.color,
                  padding: '1px 8px', borderRadius: 10,
                }}>
                  {items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
                    Cargando...
                  </p>
                ) : items.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
                    Sin solicitudes
                  </p>
                ) : (
                  items.slice(0, 8).map((req) => (
                    <LabCard
                      key={req.id}
                      request={req}
                      onClick={() => onSelectRequest(req)}
                      color={col.color}
                    />
                  ))
                )}
                {items.length > 8 && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                    Ver +{items.length - 8} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
