import { memo, useMemo } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

// ── Props ────────────────────────────────────────────────────────────────────

interface SparklineTrendProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

// ── Catmull-Rom to Cubic Bezier ──────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

function catmullRomToBezier(
  points: Point[],
  tension = 0.3,
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

// ── Component ────────────────────────────────────────────────────────────────

export const SparklineTrend = memo(function SparklineTrend({
  data,
  color = '#0d9488',
  width = 80,
  height = 28,
  showArea = false,
}: SparklineTrendProps) {
  const theme = useTheme();
  const { linePath, areaPath } = useMemo(() => {
    if (!data || data.length === 0) {
      return { linePath: '', areaPath: '' };
    }

    if (data.length === 1) {
      const cy = height / 2;
      const cx = width / 2;
      return {
        linePath: `M ${cx} ${cy} L ${cx + 0.1} ${cy}`,
        areaPath: '',
      };
    }

    const validData = data.filter((v) => !Number.isNaN(v));
    if (validData.length === 0) {
      return { linePath: '', areaPath: '' };
    }

    const dataMin = Math.min(...validData);
    const dataMax = Math.max(...validData);
    const dataRange = dataMax - dataMin || 1;

    const paddingX = 2;
    const paddingY = 2;
    const drawWidth = width - paddingX * 2;
    const drawHeight = height - paddingY * 2;

    const points: Point[] = validData.map((value, index) => ({
      x: paddingX + (index / (validData.length - 1)) * drawWidth,
      y:
        paddingY +
        drawHeight -
        ((value - dataMin) / dataRange) * drawHeight,
    }));

    const line = catmullRomToBezier(points);

    let area = '';
    if (showArea) {
      const lastPoint = points[points.length - 1]!;
      const firstPoint = points[0]!;
      area = `${line} L ${lastPoint.x} ${height - paddingY} L ${firstPoint.x} ${height - paddingY} Z`;
    }

    return { linePath: line, areaPath: area };
  }, [data, width, height, showArea]);

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: theme.palette.text.disabled,
          }}
        />
      </Box>
    );
  }

  const gradientId = `sparkline-grad-${color.replace('#', '')}`;

  return (
    <Box
      sx={{
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        {showArea && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
        )}

        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
          />
        )}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Endpoint dot */}
        {data.length > 0 && (
          <circle
            cx={(() => {
              const validData = data.filter((v) => !Number.isNaN(v));
              if (validData.length <= 1) return width / 2;
              return 2 + ((validData.length - 1) / (validData.length - 1)) * (width - 4);
            })()}
            cy={(() => {
              const validData = data.filter((v) => !Number.isNaN(v));
              if (validData.length === 0) return height / 2;
              const dataMin = Math.min(...validData);
              const dataMax = Math.max(...validData);
              const dataRange = dataMax - dataMin || 1;
              const lastVal = validData[validData.length - 1]!;
              return 2 + (height - 4) - ((lastVal - dataMin) / dataRange) * (height - 4);
            })()}
            r={2}
            fill={color}
          />
        )}
      </svg>
    </Box>
  );
});

export default SparklineTrend;
