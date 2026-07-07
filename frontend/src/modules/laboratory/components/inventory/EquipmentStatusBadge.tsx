interface EquipmentStatusBadgeProps {
  status: 'online' | 'offline' | 'maintenance' | 'calibration';
  name?: string;
}

export default function EquipmentStatusBadge({ status, name }: EquipmentStatusBadgeProps) {
  const config = {
    online: { color: '#22c55e', bg: '#f0fdf4', label: 'En línea' },
    offline: { color: '#ef4444', bg: '#fef2f2', label: 'Fuera de línea' },
    maintenance: { color: '#f59e0b', bg: '#fffbeb', label: 'Mantenimiento' },
    calibration: { color: '#3b82f6', bg: '#eff6ff', label: 'Calibración' },
  };

  const c = config[status] || config.offline;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 6,
      background: c.bg, fontSize: 12, fontWeight: 600,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: c.color,
        animation: status === 'online' ? 'pulse 2s infinite' : 'none',
      }} />
      {name && <span style={{ color: 'var(--text-secondary)' }}>{name}:</span>}
      <span style={{ color: c.color }}>{c.label}</span>
    </div>
  );
}
