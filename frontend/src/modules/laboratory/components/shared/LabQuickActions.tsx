import { useState, useRef, useEffect } from 'react';

interface ActionDef {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  handler: () => void;
  divider?: boolean;
}

interface LabQuickActionsProps {
  actions: ActionDef[];
  position?: 'left' | 'right';
}

export default function LabQuickActions({ actions, position = 'right' }: LabQuickActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ fontSize: 16, padding: '4px 8px' }}
        title="Acciones"
      >
        ⋯
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          [position]: 0,
          marginTop: 4,
          minWidth: 180,
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          padding: '4px',
        }}>
          {actions.map((action, idx) => (
            <div key={action.key}>
              {action.divider && idx > 0 && (
                <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  action.handler();
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  fontSize: 13,
                  color: action.color || 'var(--text-primary)',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {action.icon && <span>{action.icon}</span>}
                {action.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
