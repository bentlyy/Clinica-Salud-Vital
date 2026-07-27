import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import ScienceIcon from '@mui/icons-material/Science';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RepeatIcon from '@mui/icons-material/Repeat';
import ErrorIcon from '@mui/icons-material/Error';
import SpeedIcon from '@mui/icons-material/Speed';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useLabAnalytics } from '../hooks/useLab';

interface DateRangeForm {
  dateFrom: string;
  dateTo: string;
}

const SUMMARY_METRIC_KEYS = [
  { key: 'total', i18nKey: 'total_tests', icon: ScienceIcon, colorKey: 'primary.main' as const, bgColorKey: 'custom.brand.lightest' as const },
  { key: 'avg_time', i18nKey: 'avg_time', icon: AccessTimeIcon, colorKey: 'info.dark' as const, bgColorKey: 'custom.status.info.bg' as const },
  { key: 'repeat_rate', i18nKey: 'repeat_rate', icon: RepeatIcon, colorKey: 'warning.dark' as const, bgColorKey: 'custom.status.warning.bg' as const },
  { key: 'error_rate', i18nKey: 'error_rate', icon: ErrorIcon, colorKey: 'error.main' as const, bgColorKey: 'custom.status.error.bg' as const },
  { key: 'sla', i18nKey: 'sla_compliance', icon: SpeedIcon, colorKey: 'success.dark' as const, bgColorKey: 'custom.status.success.bg' as const },
  { key: 'revenue', i18nKey: 'revenue', icon: AttachMoneyIcon, colorKey: 'secondary.main' as const, bgColorKey: 'custom.surface.muted' as const },
] as const;

import type { Theme } from '@mui/material/styles';

function getNestedColor(palette: Theme['palette'], path: string): string {
  const parts = path.split('.');
  let current: Record<string, unknown> = palette as unknown as Record<string, unknown>;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part] as Record<string, unknown>;
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}

function LabAnalyticsPage() {
  const { t } = useTranslation('lab_analytics');
  const theme = useTheme();
  const [dateRange, setDateRange] = useState<{ dateFrom: string; dateTo: string }>({
    dateFrom: '',
    dateTo: '',
  });

  const { control, handleSubmit } = useForm<DateRangeForm>({
    defaultValues: { dateFrom: '', dateTo: '' },
  });

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useLabAnalytics({
    dateFrom: dateRange.dateFrom || undefined,
    dateTo: dateRange.dateTo || undefined,
  });

  const onSubmit = (data: DateRangeForm) => {
    setDateRange({ dateFrom: data.dateFrom, dateTo: data.dateTo });
  };

  const dailyData = useMemo(() => analytics?.daily ?? [], [analytics]);

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as Error} onRetry={() => void refetch()} />;
  if (!analytics) return <EmptyState title={t('no_data_title')} message={t('no_data_message')} />;

  const summaryValues: Record<string, string | number> = {
    total: dailyData.reduce((sum, d) => sum + d.count, 0),
    avg_time: `${analytics.avg_processing_time?.toFixed(1) ?? 0} min`,
    repeat_rate: `${analytics.repeat_rate?.toFixed(1) ?? 0}%`,
    error_rate: `${analytics.error_rate?.toFixed(1) ?? 0}%`,
    sla: `${analytics.sla_compliance?.toFixed(1) ?? 0}%`,
    revenue: formatCurrency(analytics.total_revenue ?? 0),
  };

  // SVG Bar chart
  const BAR_WIDTH = 800;
  const BAR_HEIGHT = 260;
  const BAR_PADDING = { top: 20, right: 20, bottom: 50, left: 60 };
  const BAR_PLOT_W = BAR_WIDTH - BAR_PADDING.left - BAR_PADDING.right;
  const BAR_PLOT_H = BAR_HEIGHT - BAR_PADDING.top - BAR_PADDING.bottom;
  const barMaxCount = Math.max(...dailyData.map((d) => d.count), 1);
  const barSlotWidth = dailyData.length > 0 ? BAR_PLOT_W / dailyData.length : BAR_PLOT_W;

  // SVG Horizontal bar chart for areas
  const AREA_CHART_W = 800;
  const AREA_CHART_H = Math.max(200, (analytics.by_area?.length ?? 0) * 40 + 60);
  const AREA_PADDING = { top: 20, right: 80, bottom: 20, left: 140 };
  const areaMaxCount = Math.max(...(analytics.by_area?.map((a) => a.count) ?? [1]), 1);

  const priorityColorMap: Record<string, { lightKey: string; colorKey: string }> = {
    low: { lightKey: 'custom.surface.sunken', colorKey: 'text.secondary' },
    normal: { lightKey: 'custom.status.info.bg', colorKey: 'info.main' },
    urgent: { lightKey: 'custom.status.warning.bg', colorKey: 'warning.main' },
    emergency: { lightKey: 'custom.status.error.bg', colorKey: 'error.main' },
  };

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Box
            component="form"
            onSubmit={(e: React.FormEvent) => void handleSubmit(onSubmit)(e)}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}
          >
            <Controller
              name="dateFrom"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  type="date"
                  label={t('date_from')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              )}
            />
            <Controller
              name="dateTo"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  type="date"
                  label={t('date_to')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              )}
            />
            <Box component="button" type="submit" style={{ display: 'none' }} />
          </Box>
        }
      />

      {/* Summary Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {SUMMARY_METRIC_KEYS.map((m) => (
          <Grid xs={6} sm={4} md={2} key={m.key}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '14px',
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: getNestedColor(theme.palette, m.bgColorKey),
                  color: getNestedColor(theme.palette, m.colorKey),
                }}
              >
                <m.icon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                  {t(m.i18nKey)}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                  {summaryValues[m.key]}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Daily Volume Bar Chart */}
        <Grid xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('daily_volume')}
            </Typography>
            {dailyData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('no_data_for_range')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <svg width={BAR_WIDTH} height={BAR_HEIGHT} viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`} style={{ display: 'block' }}>
                  {/* Y axis grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const y = BAR_PADDING.top + BAR_PLOT_H * (1 - pct);
                    return (
                      <g key={`y-${pct}`}>
                        <line x1={BAR_PADDING.left} y1={y} x2={BAR_PADDING.left + BAR_PLOT_W} y2={y} stroke={theme.palette.custom.surface.sunken} strokeWidth={1} />
                        <text x={BAR_PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill={theme.palette.text.secondary} fontFamily={theme.typography.fontFamily}>
                          {Math.round(barMaxCount * pct)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {dailyData.map((d, i) => {
                    const barH = (d.count / barMaxCount) * BAR_PLOT_H;
                    const x = BAR_PADDING.left + i * barSlotWidth + barSlotWidth * 0.15;
                    const w = barSlotWidth * 0.7;
                    const y = BAR_PADDING.top + BAR_PLOT_H - barH;
                    return (
                      <g key={d.date}>
                        <rect x={x} y={y} width={w} height={barH} rx={4} fill={theme.palette.primary.main} opacity={0.85} />
                        <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={theme.palette.text.primary} fontFamily={theme.typography.fontFamily}>
                          {d.count}
                        </text>
                        {i % Math.max(1, Math.floor(dailyData.length / 8)) === 0 && (
                          <text x={x + w / 2} y={BAR_HEIGHT - 8} textAnchor="middle" fontSize={9} fill={theme.palette.text.secondary} fontFamily={theme.typography.fontFamily}>
                            {d.date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Tests by Area — Horizontal Bar */}
        <Grid xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('tests_by_area')}
            </Typography>
            {analytics.by_area && analytics.by_area.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <svg width="100%" height={AREA_CHART_H} viewBox={`0 0 ${AREA_CHART_W} ${AREA_CHART_H}`} style={{ display: 'block' }}>
                  {analytics.by_area.map((a, i) => {
                    const y = AREA_PADDING.top + i * 40;
                    const barW = (a.count / areaMaxCount) * (AREA_CHART_W - AREA_PADDING.left - AREA_PADDING.right);
                    return (
                      <g key={a.area_name}>
                        <text x={AREA_PADDING.left - 8} y={y + 14} textAnchor="end" fontSize={11} fill={theme.palette.text.primary} fontFamily={theme.typography.fontFamily}>
                          {a.area_name}
                        </text>
                        <rect x={AREA_PADDING.left} y={y} width={barW} height={24} rx={6} fill={theme.palette.primary.main} opacity={0.8} />
                        <text x={AREA_PADDING.left + barW + 6} y={y + 16} fontSize={10} fill={theme.palette.text.secondary} fontFamily={theme.typography.fontFamily}>
                          {a.count}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 4 }}>
                {t('no_data')}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Top 5 Tests */}
        <Grid xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('top_5_tests')}
            </Typography>
            {analytics.top_tests && analytics.top_tests.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {analytics.top_tests.slice(0, 5).map((t, i) => {
                  const maxCount = analytics.top_tests[0]?.count ?? 1;
                  const pct = (t.count / maxCount) * 100;
                  return (
                    <Box key={t.test_name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                          {i + 1}. {t.test_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {t.count}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 3, backgroundColor: theme.palette.custom.surface.sunken, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: theme.palette.primary.main, transition: 'width 0.3s' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 3 }}>{t('no_data')}</Typography>
            )}
          </Paper>
        </Grid>

        {/* Priority Distribution */}
        <Grid xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('priority_distribution')}
            </Typography>
            {analytics.by_priority && analytics.by_priority.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {analytics.by_priority.map((p) => {
                  const total = analytics.by_priority.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? (p.count / total) * 100 : 0;
                  const pColors = priorityColorMap[p.priority] ?? priorityColorMap.low ?? { lightKey: 'custom.surface.muted', colorKey: 'text.secondary' };
                  return (
                    <Box key={p.priority}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Chip
                          label={p.priority}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: getNestedColor(theme.palette, pColors.lightKey),
                            color: getNestedColor(theme.palette, pColors.colorKey),
                          }}
                        />
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {p.count} ({pct.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, backgroundColor: theme.palette.custom.surface.sunken, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 4,
                            backgroundColor: getNestedColor(theme.palette, pColors.colorKey),
                            transition: 'width 0.3s',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 3 }}>{t('no_data')}</Typography>
            )}
          </Paper>
        </Grid>

        {/* Requests by Doctor Table */}
        <Grid xs={12}>
          <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('requests_by_doctor')}
            </Typography>
            {analytics.by_doctor && analytics.by_doctor.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('col_doctor')}</TableCell>
                      <TableCell align="right">{t('col_requests')}</TableCell>
                      <TableCell align="right">{t('col_avg_time')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.by_doctor.map((d) => (
                      <TableRow key={d.doctor_name} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                            {d.doctor_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            {d.count}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            {(d as { avg_time_min?: number }).avg_time_min?.toFixed(1) ?? '—'} min
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 3 }}>
                {t('no_doctor_data')}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default memo(LabAnalyticsPage);
