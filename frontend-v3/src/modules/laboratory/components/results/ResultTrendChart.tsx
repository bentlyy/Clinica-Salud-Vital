import { memo, useMemo, useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Skeleton,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { LabResultHistory } from '../../types/lab.types';

// ── Props ────────────────────────────────────────────────────────────────────

interface ResultTrendChartProps {
  history?: LabResultHistory[];
  testUnit?: string;
  isLoading?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CHART_WIDTH = 600;
const CHART_HEIGHT = 260;
const PADDING = { top: 24, right: 32, bottom: 48, left: 56 };
const GRADIENT_SUFFIX = 'trend';

// ── Tooltip Data ─────────────────────────────────────────────────────────────

interface TooltipData {
  x: number;
  y: number;
  value: string;
  date: string;
  isCritical: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export const ResultTrendChart = memo(function ResultTrendChart({
  history = [],
  testUnit = '',
  isLoading = false,
}: ResultTrendChartProps) {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const TEAL = theme.palette.primary.main;
  const RED = theme.palette.error.main;
  const GRAY = theme.palette.text.secondary;
  const LIGHT_GRAY = theme.palette.divider;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime(),
      ),
    [history],
  );

  const chartPoints = useMemo(() => {
    if (sortedHistory.length === 0) return { points: [], yMin: 0, yMax: 100 };

    const values = sortedHistory.map((h) => parseFloat(h.result_value));
    const validValues = values.filter((v) => !Number.isNaN(v));

    if (validValues.length === 0) return { points: [], yMin: 0, yMax: 100 };

    const dataMin = Math.min(...validValues);
    const dataMax = Math.max(...validValues);
    const padding = (dataMax - dataMin) * 0.15 || 5;
    const yMin = dataMin - padding;
    const yMax = dataMax + padding;

    const scaleX = (index: number): number => {
      if (sortedHistory.length === 1) return PADDING.left + innerWidth / 2;
      return PADDING.left + (index / (sortedHistory.length - 1)) * innerWidth;
    };

    const scaleY = (value: number): number => {
      return PADDING.top + innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight;
    };

    const points = sortedHistory.map((item, index) => {
      const value = parseFloat(item.result_value);
      const x = scaleX(index);
      const y = scaleY(value);
      const dateStr = new Date(item.checked_at).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
      });
      const isCritical =
        item.delta_check_status === 'critical' ||
        item.delta_percentage > 30;

      return {
        x,
        y,
        value: item.result_value,
        date: dateStr,
        isCritical,
        index,
        deltaStatus: item.delta_check_status,
      };
    });

    return { points, yMin, yMax };
  }, [sortedHistory, innerWidth, innerHeight]);

  const handleMouseEnter = useCallback(
    (point: (typeof chartPoints.points)[number]) => {
      setTooltip({
        x: point.x,
        y: point.y,
        value: point.value,
        date: point.date,
        isCritical: point.isCritical,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '14px',
        }}
      >
        <Skeleton variant="text" width={160} height={28} />
        <Skeleton
          variant="rectangular"
          width="100%"
          height={CHART_HEIGHT}
          sx={{ borderRadius: '10px', mt: 1 }}
        />
      </Paper>
    );
  }

  // ── Empty / insufficient data ────────────────────────────────────────────

  if (!history || history.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '14px',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
          Tendencia del Resultado
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, py: 4 }}>
          No hay datos históricos disponibles.
        </Typography>
      </Paper>
    );
  }

  if (sortedHistory.length < 2) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '14px',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
          Tendencia del Resultado
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 5,
          }}
        >
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
            Historial insuficiente
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.disabled, mt: 0.5 }}>
            Se requieren al menos 2 resultados para mostrar la tendencia.
          </Typography>
        </Box>
      </Paper>
    );
  }

  // ── Build SVG path ───────────────────────────────────────────────────────

  const linePath = chartPoints.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath =
    chartPoints.points.length > 0
      ? `${linePath} L ${chartPoints.points[chartPoints.points.length - 1]!.x} ${PADDING.top + innerHeight} L ${chartPoints.points[0]!.x} ${PADDING.top + innerHeight} Z`
      : '';

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    const ratio = i / yTicks;
    return chartPoints.yMin + ratio * (chartPoints.yMax - chartPoints.yMin);
  });

  // X-axis labels (show every other point if many)
  const xLabelInterval = Math.max(1, Math.floor(sortedHistory.length / 6));

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '14px',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
        Tendencia del Resultado
        {testUnit && (
          <Typography
            component="span"
            variant="caption"
            sx={{ ml: 1, color: theme.palette.text.secondary, fontWeight: 400 }}
          >
            ({testUnit})
          </Typography>
        )}
      </Typography>

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          width="100%"
          height="auto"
          style={{ minWidth: 400 }}
        >
          {/* Grid lines */}
          {yTickValues.map((tick, i) => {
            const y =
              PADDING.top + innerHeight - ((tick - chartPoints.yMin) / (chartPoints.yMax - chartPoints.yMin)) * innerHeight;
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={PADDING.left + innerWidth}
                  y2={y}
                  stroke={LIGHT_GRAY}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill={GRAY}
                  fontSize={11}
                  fontFamily="inherit"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X-axis baseline */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top + innerHeight}
            stroke={LIGHT_GRAY}
            strokeWidth={1}
          />

          {/* X-axis labels */}
          {chartPoints.points.map((p, i) =>
            i % xLabelInterval === 0 ? (
              <text
                key={`xlabel-${i}`}
                x={p.x}
                y={PADDING.top + innerHeight + 20}
                textAnchor="middle"
                fill={GRAY}
                fontSize={10}
                fontFamily="inherit"
              >
                {p.date}
              </text>
            ) : null,
          )}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#areaGradient-${GRADIENT_SUFFIX})`}
              opacity={0.15}
            />
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient
              id={`areaGradient-${GRADIENT_SUFFIX}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.3} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={TEAL}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartPoints.points.map((p, i) => (
            <g key={`point-${i}`}>
              {/* Hover area (invisible, larger) */}
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => handleMouseEnter(p)}
                onMouseLeave={handleMouseLeave}
              />
              {/* Visible dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill={p.isCritical ? RED : TEAL}
                stroke={theme.palette.background.paper}
                strokeWidth={2}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          ))}

          {/* Tooltip */}
          {tooltip && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Vertical indicator line */}
              <line
                x1={tooltip.x}
                y1={PADDING.top}
                x2={tooltip.x}
                y2={PADDING.top + innerHeight}
                stroke={tooltip.isCritical ? RED : TEAL}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />

              {/* Tooltip background */}
              <rect
                x={tooltip.x - 60}
                y={tooltip.y - 46}
                width={120}
                height={36}
                rx={8}
                fill={theme.palette.text.primary}
                opacity={0.92}
              />
              <text
                x={tooltip.x}
                y={tooltip.y - 30}
                textAnchor="middle"
                fill={theme.palette.background.paper}
                fontSize={12}
                fontWeight={600}
                fontFamily="inherit"
              >
                {tooltip.value} {testUnit}
              </text>
              <text
                x={tooltip.x}
                y={tooltip.y - 16}
                textAnchor="middle"
                fill={theme.palette.text.disabled}
                fontSize={10}
                fontFamily="inherit"
              >
                {tooltip.date}
              </text>
            </g>
          )}
        </svg>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: TEAL,
            }}
          />
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Normal
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: RED,
            }}
          />
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Crítico
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
});

export default ResultTrendChart;
