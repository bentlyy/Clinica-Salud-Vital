import type { ReactNode } from 'react';

interface LabDetailPanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export default function LabDetailPanel({ title, subtitle, onClose, children, width = 420 }: LabDetailPanelProps) {
  return (
    <div style={{
      width,
      borderLeft: '1px solid var(--border-light)',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          {subtitle && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 18, padding: '4px 8px', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
