import { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

// ── Props ────────────────────────────────────────────────────────────────────

interface DeltaCheckProps {
  currentValue: string | number;
  previousValue?: string | number;
  referenceRange?: string;
  deltaCheckStatus?: string;
  unit?: string;
  timestamp?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeDeltaPercentage(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getDeltaColor(
  status?: string,
  deltaPct?: number | null,
  theme?: Theme,
): { main: string; bg: string; text: string } {
  if (status === 'critical') {
    return { main: theme?.palette.error.main ?? '#ef4444', bg: theme?.palette.error.light ?? '#fef2f2', text: theme?.palette.error.dark ?? '#991b1b' };
  }
  if (status === 'warning') {
    return { main: theme?.palette.warning.main ?? '#f59e0b', bg: theme?.palette.warning.light ?? '#fffbeb', text: theme?.palette.warning.dark ?? '#92400e' };
  }
  if (deltaPct !== null && deltaPct !== undefined) {
    const absDelta = Math.abs(deltaPct);
    if (absDelta > 30) {
      return { main: theme?.palette.error.main ?? '#ef4444', bg: theme?.palette.error.light ?? '#fef2f2', text: theme?.palette.error.dark ?? '#991b1b' };
    }
    if (absDelta > 15) {
      return { main: theme?.palette.warning.main ?? '#f59e0b', bg: theme?.palette.warning.light ?? '#fffbeb', text: theme?.palette.warning.dark ?? '#92400e' };
    }
  }
  return { main: theme?.palette.success.main ?? '#10b981', bg: theme?.palette.success.light ?? '#ecfdf5', text: theme?.palette.success.dark ?? '#065f46' };
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'critical':
      return 'Crítico';
    case 'warning':
      return 'Alerta';
    case 'normal':
      return 'Normal';
    default:
      return 'Sin estado';
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export const DeltaCheck = memo(function DeltaCheck({
  currentValue,
  previousValue,
  referenceRange,
  deltaCheckStatus,
  unit = '',
  timestamp,
}: DeltaCheckProps) {
  const theme = useTheme();

  const currentNum = useMemo(
    () => parseFloat(String(currentValue)),
    [currentValue],
  );
  const previousNum = useMemo(
    () =>
      previousValue !== undefined && previousValue !== null
        ? parseFloat(String(previousValue))
        : null,
    [previousValue],
  );

  const deltaPct = useMemo(
    () =>
      previousNum !== null && !Number.isNaN(currentNum) && !Number.isNaN(previousNum)
        ? computeDeltaPercentage(currentNum, previousNum)
        : null,
    [currentNum, previousNum],
  );

  const colors = useMemo(
    () => getDeltaColor(deltaCheckStatus, deltaPct, theme),
    [deltaCheckStatus, deltaPct, theme],
  );

  const direction =
    deltaPct !== null ? (deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'stable') : 'unknown';

  const hasPrev = previousValue !== undefined && previousValue !== null && previousNum !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {/* Current Value */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            lineHeight: 1.2,
          }}
        >
          {currentValue}
        </Typography>
        {unit && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
            {unit}
          </Typography>
        )}
      </Box>

      {/* Previous Value + Delta */}
      {hasPrev ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, fontWeight: 400 }}
          >
            Anterior: {previousValue}
          </Typography>

          {deltaPct !== null && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
                px: 1,
                py: 0.25,
                borderRadius: '8px',
                backgroundColor: colors.bg,
              }}
            >
              {direction === 'up' && (
                <TrendingUpIcon sx={{ fontSize: 14, color: colors.main }} />
              )}
              {direction === 'down' && (
                <TrendingDownIcon sx={{ fontSize: 14, color: colors.main }} />
              )}
              {direction === 'stable' && (
                <RemoveIcon sx={{ fontSize: 14, color: colors.main }} />
              )}
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: colors.text }}
              >
                {deltaPct > 0 ? '+' : ''}
                {deltaPct.toFixed(1)}%
              </Typography>
            </Box>
          )}

          {deltaCheckStatus && (
            <Chip
              label={getStatusLabel(deltaCheckStatus)}
              size="small"
              sx={{
                backgroundColor: colors.bg,
                color: colors.text,
                fontWeight: 600,
                fontSize: '0.6875rem',
                height: 22,
                borderRadius: '6px',
              }}
            />
          )}
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.disabled, fontStyle: 'italic' }}
        >
          Sin valor previo
        </Typography>
      )}

      {/* Reference Range */}
      {referenceRange && (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Rango de ref: {referenceRange}
        </Typography>
      )}

      {/* Timestamp */}
      {timestamp && (
        <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
          {new Date(timestamp).toLocaleString('es-CL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      )}
    </Box>
  );
});

export default DeltaCheck;
