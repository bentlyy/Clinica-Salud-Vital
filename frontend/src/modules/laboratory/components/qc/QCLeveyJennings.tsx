import type { LabQCRecord } from '../../types';

interface QCLeveyJenningsProps {
  records: LabQCRecord[];
  width?: number;
  height?: number;
}

export default function QCLeveyJennings({ records, width = 400, height = 160 }: QCLeveyJenningsProps) {
  const validRecords = records.filter(r => r.measured_value !== null && r.expected_min !== null && r.expected_max !== null);

  if (validRecords.length < 2) {
    return null;
  }

  const mean = validRecords.reduce((s, r) => s + r.measured_value, 0) / validRecords.length;
  const meanExpected = (validRecords[0].expected_min + validRecords[0].expected_max) / 2;
  const sd = Math.sqrt(
    validRecords.reduce((s, r) => s + Math.pow(r.measured_value - mean, 2), 0) / validRecords.length
  ) || 1;

  const values = validRecords.map(r => r.measured_value);
  const min = Math.min(...values, validRecords[0].expected_min);
  const max = Math.max(...values, validRecords[0].expected_max);
  const range = max - min || 1;
  const padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const yScale = (v: number) => padding + chartH - ((v - min) / range) * chartH;

  const meanY = yScale(mean);
  const plus1SdY = yScale(mean + sd);
  const minus1SdY = yScale(mean - sd);
  const plus2SdY = yScale(mean + 2 * sd);
  const minus2SdY = yScale(mean - 2 * sd);
  const plus3SdY = yScale(mean + 3 * sd);
  const minus3SdY = yScale(mean - 3 * sd);

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Gráfico Levey-Jennings</p>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect x="0" y="0" width={width} height={height} fill="#f9fafb" rx="4" />

        {/* +3SD zone (warning) */}
        <rect x={padding} y={plus3SdY} width={chartW} height={plus2SdY - plus3SdY} fill="#fef2f2" />
        {/* -3SD zone (warning) */}
        <rect x={padding} y={minus2SdY} width={chartW} height={minus2SdY - minus3SdY} fill="#fef2f2" />

        {/* Mean line */}
        <line x1={padding} y1={meanY} x2={padding + chartW} y2={meanY} stroke="#6b7280" strokeWidth="1" strokeDasharray="4,2" />

        {/* +/- 1SD */}
        <line x1={padding} y1={plus1SdY} x2={padding + chartW} y2={plus1SdY} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="3,2" />
        <line x1={padding} y1={minus1SdY} x2={padding + chartW} y2={minus1SdY} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="3,2" />

        {/* +/- 2SD */}
        <line x1={padding} y1={plus2SdY} x2={padding + chartW} y2={plus2SdY} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,2" />
        <line x1={padding} y1={minus2SdY} x2={padding + chartW} y2={minus2SdY} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3,2" />

        {/* +/- 3SD */}
        <line x1={padding} y1={plus3SdY} x2={padding + chartW} y2={plus3SdY} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" />
        <line x1={padding} y1={minus3SdY} x2={padding + chartW} y2={minus3SdY} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" />

        {/* Data points */}
        {validRecords.map((r, i) => {
          const x = padding + (i / (validRecords.length - 1)) * chartW;
          const y = yScale(r.measured_value);
          const isOutOfRange = r.measured_value < r.expected_min || r.measured_value > r.expected_max;
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y + 3} stroke={isOutOfRange ? '#ef4444' : '#22c55e'} strokeWidth="2" strokeLinecap="round" />
              <circle cx={x} cy={y} r="3" fill={isOutOfRange ? '#ef4444' : '#22c55e'} />
            </g>
          );
        })}

        {/* Labels */}
        <text x={padding + 4} y={plus3SdY - 2} fontSize="8" fill="#ef4444">+3SD</text>
        <text x={padding + 4} y={meanY - 2} fontSize="8" fill="#6b7280">Media</text>
        <text x={padding + 4} y={minus3SdY + 10} fontSize="8" fill="#ef4444">-3SD</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
        <span>Media: {mean.toFixed(2)}</span>
        <span>SD: {sd.toFixed(2)}</span>
        <span>n={validRecords.length}</span>
      </div>
    </div>
  );
}
