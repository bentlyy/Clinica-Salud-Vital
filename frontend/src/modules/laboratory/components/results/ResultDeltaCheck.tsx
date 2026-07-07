interface ResultDeltaCheckProps {
  currentValue: string;
  previousValue: string;
  previousDate: string;
  deltaPercentage: number;
  status: string;
  threshold: number;
}

export default function ResultDeltaCheck({
  currentValue, previousValue, previousDate,
  deltaPercentage, status, threshold,
}: ResultDeltaCheckProps) {
  const isCritical = status === 'critical';
  const isWarning = status === 'warning';
  const color = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
  const bgColor = isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : '#f0fdf4';

  return (
    <div style={{
      marginTop: 8,
      padding: '8px 12px',
      borderRadius: 6,
      background: bgColor,
      border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 16 }}>📊</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 12, color }}>Delta Check</strong>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>
            {deltaPercentage > 0 ? '+' : ''}{deltaPercentage.toFixed(1)}%
          </span>
        </div>
        <p style={{ fontSize: 11, margin: '2px 0 0', color: 'var(--text-secondary)' }}>
          Anterior: {previousValue} ({previousDate ? new Date(previousDate).toLocaleDateString() : '—'})
          {' '}| Actual: {currentValue}
          {' '}| Umbral: ±{threshold}%
        </p>
      </div>
    </div>
  );
}
