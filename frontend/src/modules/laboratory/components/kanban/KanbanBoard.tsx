import type { LabRequest, LabRequestStatus } from '../../types';
import { LAB_STATUS_LABELS, LAB_STATUS_COLORS } from '../../types';
import KanbanColumn from './KanbanColumn';
import { useLabContextMenu, type ContextMenuAction } from '../../hooks/useLabContextMenu';

interface KanbanBoardProps {
  requests: LabRequest[];
  onSelectRequest: (request: LabRequest) => void;
  onStatusChange: (requestId: number, newStatus: LabRequestStatus) => void;
  onRejectRequest?: (requestId: number) => void;
  onPrintRequest?: (requestId: number) => void;
  columns?: LabRequestStatus[];
  loading?: boolean;
}

const DEFAULT_COLUMNS: LabRequestStatus[] = [
  'pending', 'received', 'verified', 'assigned',
  'processing', 'qc_review', 'result_entered',
  'validated_tech', 'validated_doctor', 'signed', 'delivered',
];

export default function KanbanBoard({
  requests, onSelectRequest, onStatusChange,
  onRejectRequest, onPrintRequest,
  columns = DEFAULT_COLUMNS, loading,
}: KanbanBoardProps) {
  const { show, contextMenu } = useLabContextMenu();

  const handleContextMenu = (e: React.MouseEvent, req: LabRequest) => {
    const actions: ContextMenuAction[] = [
      { label: 'Ver detalle', icon: '👁', onClick: () => onSelectRequest(req) },
    ];
    if (onStatusChange && req.status !== 'delivered' && req.status !== 'cancelled') {
      actions.push(
        { divider: true },
        { label: 'Mover a Pendiente', icon: '📋', onClick: () => onStatusChange(req.id, 'pending'), disabled: req.status === 'pending' },
        { label: 'Mover a Recibido', icon: '📥', onClick: () => onStatusChange(req.id, 'received'), disabled: req.status === 'received' },
        { label: 'Mover a Procesando', icon: '⚙', onClick: () => onStatusChange(req.id, 'processing'), disabled: req.status === 'processing' },
      );
    }
    if (onPrintRequest) {
      actions.push(
        { divider: true },
        { label: 'Imprimir orden', icon: '🖨', onClick: () => onPrintRequest(req.id) },
      );
    }
    if (onRejectRequest && req.status !== 'delivered' && req.status !== 'cancelled') {
      actions.push(
        { divider: true },
        { label: 'Rechazar solicitud', icon: '✕', onClick: () => onRejectRequest(req.id), danger: true },
      );
    }
    show(e, actions);
  };

  const handleColumnDrop = (statusKey: LabRequestStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (draggedId) {
      onStatusChange(draggedId, statusKey);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 16, minHeight: '60vh' }}>
      {columns.map((statusKey) => {
        const items = requests.filter(r => r.status === statusKey);
        const color = LAB_STATUS_COLORS[statusKey] || '#6b7280';
        const label = LAB_STATUS_LABELS[statusKey] || statusKey;

        return (
          <KanbanColumn
            key={statusKey}
            title={label}
            color={color}
            count={items.length}
            loading={loading}
            onDrop={handleColumnDrop(statusKey)}
            onDragOver={(e) => e.preventDefault()}
          >
            {items.map((req) => (
              <div
                key={req.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(req.id));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onContextMenu={(e) => handleContextMenu(e, req)}
                style={{ cursor: 'grab' }}
                onClick={() => onSelectRequest(req)}
              >
                <KanbanCardPreview request={req} color={color} />
              </div>
            ))}
          </KanbanColumn>
        );
      })}
      {contextMenu}
    </div>
  );
}

export function KanbanCardPreview({ request: r, color }: { request: LabRequest; color: string }) {
  const items = r.items || [];
  const completedItems = items.filter(i =>
    ['validated_tech', 'validated_doctor', 'signed', 'delivered', 'completed'].includes(i.status)
  );
  const progressPct = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <div className="card" style={{
      padding: '10px 12px',
      borderLeft: `3px solid ${color}`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      marginBottom: 6,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {r.request_number || `#${r.id}`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
        {r.patient_name || `Paciente #${r.patient_id}`}
      </div>
      {r.doctor_name && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          {r.doctor_name}
        </div>
      )}
      {items.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`, height: '100%', borderRadius: 2,
              background: progressPct === 100 ? '#22c55e' : '#f59e0b',
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: progressPct === 100 ? '#22c55e' : '#f59e0b' }}>
            {completedItems.length}/{items.length}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 4 }}>
        {items.slice(0, 2).map((item) => (
          <span key={item.id} style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8,
            background: item.result_value ? '#d1fae5' : '#fef3c7',
            color: item.result_value ? '#065f46' : '#92400e',
          }}>
            {item.test_name}
          </span>
        ))}
      </div>
    </div>
  );
}
