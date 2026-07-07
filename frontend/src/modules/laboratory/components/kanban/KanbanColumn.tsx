import type { ReactNode } from 'react';

import type { ReactNode, DragEvent } from 'react';

interface KanbanColumnProps {
  title: string;
  color: string;
  count: number;
  loading?: boolean;
  children: ReactNode;
  onDrop?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
}

export default function KanbanColumn({ title, color, count, loading, children, onDrop, onDragOver }: KanbanColumnProps) {
  return (
    <div style={{
      minWidth: 220,
      maxWidth: 280,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', marginBottom: 8,
        background: `${color}08`,
        borderRadius: 8, border: `1px solid ${color}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <strong style={{ fontSize: 13, color }}>{title}</strong>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: '#fff', background: color,
          padding: '1px 8px', borderRadius: 10,
        }}>
          {count}
        </span>
      </div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          flex: 1,
          padding: '4px',
          borderRadius: 8,
          background: '#f9fafb',
          minHeight: 200,
          overflow: 'auto',
        }}
      >
        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
            Cargando...
          </p>
        ) : count === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
            Sin elementos
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
