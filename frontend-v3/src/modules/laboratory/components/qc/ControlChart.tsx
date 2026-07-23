import { memo, useMemo, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { LabQCRecord } from '../../types/lab.types';

// ── Props ────────────────────────────────────────────────────────────────────

interface ControlChartProps {
  records?: LabQCRecord[];
  testName?: string;
  areaName?: string;
  isLoading?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CHART_WIDTH = 800;
const CHART_HEIGHT = 340;
const PADDING = { top: 24, right: 24, bottom: 56, left: 64 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calcStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export const ControlChart = memo(function ControlChart({
  records = [],
  testName = 'Test',
  areaName = '',
  isLoading = false,
}: ControlChartProps) {
  const theme = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(a.performed_at ?? 0).getTime() -
          new Date(b.performed_at ?? 0).getTime(),
      ),
    [records],
  );

  const values = useMemo(
    () => sorted.map((r) => r.measured_value),
    [sorted],
  );

  const stats = useMemo(() => {
    const mean = calcMean(values);
    const sd = calcStdDev(values, mean);
    return {
      mean,
      sd,
      ucl: mean + 2 * sd,
      lcl: mean - 2 * sd,
      uwl: mean + sd,
      lwl: mean - sd,
    };
  }, [values]);

  // Scale helpers
  const dataMin = useMemo(() => {
    const vals = [...values, stats.lcl, stats.lwl];
    return Math.min(...vals);
  }, [values, stats]);

  const dataMax = useMemo(() => {
    const vals = [...values, stats.ucl, stats.uwl];
    return Math.max(...vals);
  }, [values, stats]);

  const yScale = useCallback(
    (v: number) => {
      const range = dataMax - dataMin || 1;
      return PLOT_HEIGHT - ((v - dataMin) / range) * PLOT_HEIGHT;
    },
    [dataMin, dataMax],
  );

  const xScale = useCallback(
    (i: number) => {
      if (sorted.length <= 1) return PLOT_WIDTH / 2;
      return (i / (sorted.length - 1)) * PLOT_WIDTH;
    },
    [sorted.length],
  );

  // Build SVG path for the data line
  const linePath = useMemo(() => {
    if (sorted.length === 0) return '';
    return sorted
      .map((_, i) => {
        const x = xScale(i);
        const y = yScale(values[i]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [sorted, values, xScale, yScale]);

  // Point color based on value relative to limits
  const getPointColor = (value: number): string => {
    const palette = theme.palette;
    if (value > stats.ucl || value < stats.lcl) return palette.error.main;
    if (value > stats.uwl || value < stats.lwl) return palette.warning.main;
    return palette.success.main;
  };

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
        }}
      >
        <Skeleton variant="text" width="60%" height={28} />
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={CHART_HEIGHT} sx={{ borderRadius: '10px' }} />
      </Paper>
    );
  }

  if (sorted.length < 2) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
          Gráfico de Control - {testName}
        </Typography>
        {areaName && (
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            {areaName}
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: CHART_HEIGHT,
            color: '#9ca3af',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Datos insuficientes para gráfico
          </Typography>
        </Box>
      </Paper>
    );
  }

  const tooltipData = hoveredIndex !== null ? sorted[hoveredIndex] : null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
        Gráfico de Control - {testName}
      </Typography>
      {areaName && (
        <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
          {areaName}
        </Typography>
      )}

      {/* Chart */}
      <Box sx={{ overflowX: 'auto' }}>
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          style={{ display: 'block' }}
        >
          {/* Background */}
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill={theme.palette.background.default}
            rx={4}
          />

          {/* Y-axis gridlines */}
          {[stats.lcl, stats.lwl, stats.mean, stats.uwl, stats.ucl].map(
            (val, i) => {
              const y = PADDING.top + yScale(val);
              return (
                <text
                  key={`y-label-${i}`}
                  x={PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="#9ca3af"
                  fontFamily={theme.typography.fontFamily}
                >
                  {val.toFixed(2)}
                </text>
              );
            },
          )}

          {/* Upper Control Limit (dashed amber) */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + yScale(stats.ucl)}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + yScale(stats.ucl)}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="8 4"
            opacity={0.8}
          />
          <text
            x={PADDING.left + PLOT_WIDTH + 4}
            y={PADDING.top + yScale(stats.ucl) + 4}
            fontSize={10}
            fill="#f59e0b"
            fontFamily={theme.typography.fontFamily}
          >
            +2σ
          </text>

          {/* Lower Control Limit (dashed amber) */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + yScale(stats.lcl)}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + yScale(stats.lcl)}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="8 4"
            opacity={0.8}
          />
          <text
            x={PADDING.left + PLOT_WIDTH + 4}
            y={PADDING.top + yScale(stats.lcl) + 4}
            fontSize={10}
            fill="#f59e0b"
            fontFamily={theme.typography.fontFamily}
          >
            -2σ
          </text>

          {/* Upper Warning Limit (dotted yellow) */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + yScale(stats.uwl)}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + yScale(stats.uwl)}
            stroke="#eab308"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.6}
          />
          <text
            x={PADDING.left + PLOT_WIDTH + 4}
            y={PADDING.top + yScale(stats.uwl) + 4}
            fontSize={10}
            fill="#eab308"
            fontFamily={theme.typography.fontFamily}
          >
            +1σ
          </text>

          {/* Lower Warning Limit (dotted yellow) */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + yScale(stats.lwl)}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + yScale(stats.lwl)}
            stroke="#eab308"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.6}
          />
          <text
            x={PADDING.left + PLOT_WIDTH + 4}
            y={PADDING.top + yScale(stats.lwl) + 4}
            fontSize={10}
            fill="#eab308"
            fontFamily={theme.typography.fontFamily}
          >
            -1σ
          </text>

          {/* Center Line (mean - solid teal) */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + yScale(stats.mean)}
            x2={PADDING.left + PLOT_WIDTH}
            y2={PADDING.top + yScale(stats.mean)}
            stroke="#0d9488"
            strokeWidth={2}
          />
          <text
            x={PADDING.left + PLOT_WIDTH + 4}
            y={PADDING.top + yScale(stats.mean) + 4}
            fontSize={10}
            fill="#0d9488"
            fontWeight={600}
            fontFamily={theme.typography.fontFamily}
          >
            Media
          </text>

          {/* X-axis labels */}
          {sorted.map((record, i) => {
            const x = PADDING.left + xScale(i);
            // Show every Nth label to avoid crowding
            const step = Math.max(1, Math.floor(sorted.length / 10));
            if (i % step !== 0 && i !== sorted.length - 1) return null;
            return (
              <text
                key={`x-label-${i}`}
                x={x}
                y={CHART_HEIGHT - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
                fontFamily={theme.typography.fontFamily}
              >
                {formatDate(record.performed_at)}
              </text>
            );
          })}

          {/* Data line */}
          <path
            d={linePath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            transform={`translate(${PADDING.left}, ${PADDING.top})`}
          />

          {/* Data points */}
          {sorted.map((record, i) => {
            const cx = PADDING.left + xScale(i);
            const cy = PADDING.top + yScale(record.measured_value);
            const color = getPointColor(record.measured_value);
            const isHovered = hoveredIndex === i;

            return (
              <g key={record.id}>
                {/* Larger invisible hit area */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={14}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Visible point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ transition: 'r 0.15s ease', pointerEvents: 'none' }}
                />
              </g>
            );
          })}

          {/* Hover crosshair */}
          {hoveredIndex !== null && (
            <>
              <line
                x1={PADDING.left + xScale(hoveredIndex)}
                y1={PADDING.top}
                x2={PADDING.left + xScale(hoveredIndex)}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            </>
          )}
        </svg>
      </Box>

      {/* Hover Tooltip */}
      {tooltipData && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            backgroundColor: '#f9fafb',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>
            {formatDateTime(tooltipData.performed_at)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              Valor: <strong style={{ color: getPointColor(tooltipData.measured_value) }}>{tooltipData.measured_value}</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              Tipo: {tooltipData.qc_type}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              Control: {tooltipData.control_name}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.success.main }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Pasó</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.warning.main }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Advertencia</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: theme.palette.error.main }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Falló</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 20, height: 2, backgroundColor: '#0d9488' }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Media</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 20, height: 0, borderTop: '2px dashed #f59e0b' }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Límites Control (±2σ)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 20, height: 0, borderTop: '2px dotted #eab308' }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Límites Advertencia (±1σ)</Typography>
        </Box>
      </Box>
    </Paper>
  );
});

export default ControlChart;
