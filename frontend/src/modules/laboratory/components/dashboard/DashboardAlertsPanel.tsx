import type { LabNotification } from '../../types';

interface DashboardAlertsPanelProps {
  notifications: LabNotification[];
  onAcknowledge: (id: number) => void;
  onAcknowledgeAll: () => void;
  loading?: boolean;
}

export default function DashboardAlertsPanel({
  notifications, onAcknowledge, onAcknowledgeAll, loading,
}: DashboardAlertsPanelProps) {
  const unread = notifications.filter(n => !n.acknowledged);
  if (loading) return null;
  if (unread.length === 0) return null;

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const severityBg = (s: string) => {
    switch (s) {
      case 'critical': return '#fef2f2';
      case 'warning': return '#fffbeb';
      default: return '#eff6ff';
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 10,
      background: '#fff',
      border: '1px solid var(--border-light)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <strong style={{ fontSize: 14 }}>Alertas ({unread.length})</strong>
        </div>
        <button onClick={onAcknowledgeAll} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Descartar todas
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {unread.slice(0, 5).map((n) => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8,
            background: severityBg(n.severity),
            borderLeft: `3px solid ${severityColor(n.severity)}`,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: severityColor(n.severity), flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 13 }}>{n.title}</strong>
              <p style={{ fontSize: 12, margin: '2px 0 0', color: 'var(--text-secondary)' }}>
                {n.message}
              </p>
            </div>
            <button
              onClick={() => onAcknowledge(n.id)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12, flexShrink: 0 }}
            >
              OK
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
