import type { ReactNode } from 'react';

interface LabMetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; value: string };
  onClick?: () => void;
}

export default function LabMetricCard({ label, value, icon, color = '#06b6d4', trend, onClick }: LabMetricCardProps) {
  const trendColor = trend?.direction === 'up' ? '#22c55e'
    : trend?.direction === 'down' ? '#ef4444'
    : '#6b7280';

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            {label}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>
            {value}
          </p>
          {trend && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: trendColor }}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
            </p>
          )}
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
