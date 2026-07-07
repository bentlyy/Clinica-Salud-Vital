interface DataPoint {
  date: string;
  value: number;
}

interface ResultTrendSparklineProps {
  data: DataPoint[];
  color?: string;
  width?: number;
  height?: number;
}

export default function ResultTrendSparkline({
  data, color = '#06b6d4',
  width = 120, height = 32,
}: ResultTrendSparklineProps) {
  if (data.length < 2) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const trend = values[values.length - 1] - values[0];
  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : color;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.length > 0 && (
          <>
            <circle
              cx={points[0].split(',')[0]}
              cy={points[0].split(',')[1]}
              r="2"
              fill={trendColor}
              opacity="0.5"
            />
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="2.5"
              fill={trendColor}
            />
          </>
        )}
      </svg>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: trendColor, whiteSpace: 'nowrap',
      }}>
        {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}
      </span>
    </div>
  );
}
