interface ResultCriticalAlertProps {
  value: string;
  testName: string;
  min: number | null;
  max: number | null;
  unit?: string;
}

export default function ResultCriticalAlert({ value, testName, min, max, unit }: ResultCriticalAlertProps) {
  const numValue = Number(value);
  let reason = '';
  if (!isNaN(numValue)) {
    if (min !== null && numValue < min) reason = `Valor por debajo del límite crítico (${min}${unit ? ' ' + unit : ''})`;
    if (max !== null && numValue > max) reason = `Valor por encima del límite crítico (${max}${unit ? ' ' + unit : ''})`;
  }

  return (
    <div style={{
      marginTop: 8,
      padding: '8px 12px',
      borderRadius: 6,
      background: '#fef2f2',
      border: '1px solid #fecaca',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 18 }}>🚨</span>
      <div>
        <strong style={{ fontSize: 12, color: '#dc2626' }}>VALOR CRÍTICO</strong>
        <p style={{ fontSize: 12, margin: '2px 0 0', color: '#991b1b' }}>
          {testName}: {value} {unit} — {reason}
        </p>
      </div>
    </div>
  );
}
