import type { LabRequestItem, LabTest } from '../../types';

interface ResultDisplayByTypeProps {
  item: LabRequestItem;
  test?: LabTest;
}

export default function ResultDisplayByType({ item, test }: ResultDisplayByTypeProps) {
  if (!test) {
    return <span style={{ fontSize: 14, fontWeight: 600 }}>{item.result_value || '—'}</span>;
  }

  const value = item.result_value;
  const numValue = value && !isNaN(Number(value)) ? Number(value) : null;

  const isOutOfRange = numValue !== null && test && (
    (test.critical_min !== null && numValue < test.critical_min) ||
    (test.critical_max !== null && numValue > test.critical_max)
  );

  const isWarningRange = numValue !== null && !isOutOfRange && test && (
    (test.reference_min !== null && numValue < test.reference_min) ||
    (test.reference_max !== null && numValue > test.reference_max)
  );

  const rangeColor = isOutOfRange ? '#ef4444' : isWarningRange ? '#f59e0b' : '#22c55e';

  switch (test.result_type) {
    case 'numeric': {
      if (!numValue) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 16, fontWeight: 700, color: rangeColor,
            padding: '2px 10px', borderRadius: 6,
            background: `${rangeColor}12`,
          }}>
            {numValue.toFixed(test.decimals || 1)}
          </span>
          {test.unit && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{test.unit}</span>
          )}
          <span style={{
            fontSize: 11,
            color: rangeColor,
            fontWeight: 600,
            background: `${rangeColor}10`,
            padding: '1px 6px',
            borderRadius: 4,
          }}>
            {isOutOfRange ? 'CRÍTICO' : isWarningRange ? 'ALTO' : 'Normal'}
          </span>
        </div>
      );
    }

    case 'select': {
      return (
        <span style={{
          fontSize: 14, fontWeight: 600,
          padding: '2px 10px', borderRadius: 6,
          background: '#f0fdf4', color: '#065f46',
        }}>
          {value || '—'}
        </span>
      );
    }

    case 'text': {
      return <span style={{ fontSize: 14 }}>{value || '—'}</span>;
    }

    case 'image': {
      return value ? (
        <img src={value} alt="Resultado" style={{ maxWidth: 200, borderRadius: 8 }} />
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>Sin imagen</span>
      );
    }

    default: {
      return <span style={{ fontSize: 14, fontWeight: 600 }}>{value || '—'}</span>;
    }
  }
}
