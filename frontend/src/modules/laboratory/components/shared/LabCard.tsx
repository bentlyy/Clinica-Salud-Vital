import type { ReactNode } from 'react';
import type { LabRequest, LabRequestStatus, LabPriority } from '../../types';
import LabStatusBadge from './LabStatusBadge';
import LabPriorityChip from './LabPriorityChip';

interface LabCardProps {
  request: LabRequest;
  icon?: ReactNode;
  color?: string;
  onClick?: () => void;
  actions?: ReactNode;
  selected?: boolean;
}

export default function LabCard({ request, icon, color = '#06b6d4', onClick, actions, selected }: LabCardProps) {
  const items = request.items || [];
  const completedItems = items.filter(i =>
    ['validated_tech', 'validated_doctor', 'signed', 'delivered', 'completed'].includes(i.status)
  );
  const progressPct = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;
  const isUrgent = request.priority === 'urgent' || request.priority === 'emergency';

  return (
    <div
      className="card"
      style={{
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        border: selected ? `2px solid ${color}` : '1px solid var(--border-light)',
        boxShadow: selected ? `0 0 0 3px ${color}20` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.15s',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08)`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = selected ? `0 0 0 3px ${color}20` : '0 1px 3px rgba(0,0,0,0.06)';
        }
      }}
    >
      {isUrgent && (
        <div style={{
          height: 3,
          background: request.priority === 'emergency' ? '#ef4444' : '#f59e0b',
          width: '100%',
        }} />
      )}

      <div style={{ display: 'flex' }}>
        {icon && (
          <div style={{
            width: 72,
            minHeight: '100%',
            background: `linear-gradient(180deg, ${color}12, ${color}04)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {icon}
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 14, lineHeight: 1.3 }}>
                {request.request_number || `#${request.id}`}
              </strong>
              {items.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {items.length} items
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              <LabPriorityChip priority={request.priority as LabPriority} />
              <LabStatusBadge status={request.status as LabRequestStatus} />
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
            <span>👤 {request.patient_name || `Paciente #${request.patient_id}`}</span>
            {request.patient_rut && <span>🪪 {request.patient_rut}</span>}
            {request.doctor_name && <span>🩺 {request.doctor_name}</span>}
            <span>📅 {request.created_at?.split('T')[0] || '-'}</span>
          </div>

          {items.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {items.slice(0, 3).map((item) => {
                  const isDone = ['validated_tech', 'validated_doctor', 'signed', 'delivered', 'completed'].includes(item.status);
                  return (
                    <span key={item.id} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: isDone ? '#d1fae5' : '#fef3c7',
                      color: isDone ? '#065f46' : '#92400e',
                      fontWeight: 500,
                    }}>
                      {item.test_name || `Test #${item.test_id}`}
                      {item.result_value && <span style={{ marginLeft: 3, fontWeight: 700 }}>{item.result_value}</span>}
                    </span>
                  );
                })}
                {items.length > 3 && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: 'var(--text-muted)' }}>
                    +{items.length - 3}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{
                    width: `${progressPct}%`, height: '100%', borderRadius: 2,
                    background: progressPct === 100 ? '#22c55e' : '#f59e0b',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: progressPct === 100 ? '#22c55e' : '#f59e0b', flexShrink: 0 }}>
                  {completedItems.length}/{items.length}
                </span>
              </div>
            </>
          )}

          {actions && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
