import { memo, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Skeleton,
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
import { useLabAnalytics, useLabAreas } from '../hooks/useLab';

interface DateRangeForm {
  dateFrom: string;
  dateTo: string;
}

const SUMMARY_METRICS = [
  { key: 'total', label: 'Total Pruebas', icon: ScienceIcon, color: '#0d9488', bgColor: '#f0fdfa' },
  { key: 'avg_time', label: 'Tiempo Promedio', icon: AccessTimeIcon, color: '#2563eb', bgColor: '#eff6ff' },
  { key: 'repeat_rate', label: 'Tasa Repetición', icon: RepeatIcon, color: '#d97706', bgColor: '#fffbeb' },
  { key: 'error_rate', label: 'Tasa Error', icon: ErrorIcon, color: '#ef4444', bgColor: '#fef2f2' },
  { key: 'sla', label: 'Cumplimiento SLA', icon: SpeedIcon, color: '#059669', bgColor: '#ecfdf5' },
  { key: 'revenue', label: 'Ingresos', icon: AttachMoneyIcon, color: '#7c3aed', bgColor: '#f5f3ff' },
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
}

function LabAnalyticsPage() {
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

  if (isLoading) return <LoadingState message="Cargando analitica..." />;
  if (error) return <ErrorState error={error as Error} onRetry={() => void refetch()} />;
  if (!analytics) return <EmptyState title="Sin datos" message="No hay datos de analitica disponibles." />;

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

  return (
    <Box>
      <PageHeader
        title="Analitica de Laboratorio"
        subtitle="Metricas, volumen y tendencias"
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
                  label="Desde"
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
                  label="Hasta"
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
        {SUMMARY_METRICS.map((m) => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={m.key}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: '1px solid #e5e7eb',
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
                  backgroundColor: m.bgColor,
                  color: m.color,
                }}
              >
                <m.icon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                  {m.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
                  {summaryValues[m.key]}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Daily Volume Bar Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Volumen Diario
            </Typography>
            {dailyData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Sin datos para el rango seleccionado
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
                        <line x1={BAR_PADDING.left} y1={y} x2={BAR_PADDING.left + BAR_PLOT_W} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                        <text x={BAR_PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af" fontFamily={theme.typography.fontFamily}>
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
                        <rect x={x} y={y} width={w} height={barH} rx={4} fill="#0d9488" opacity={0.85} />
                        <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#374151" fontFamily={theme.typography.fontFamily}>
                          {d.count}
                        </text>
                        {i % Math.max(1, Math.floor(dailyData.length / 8)) === 0 && (
                          <text x={x + w / 2} y={BAR_HEIGHT - 8} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily={theme.typography.fontFamily}>
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
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Pruebas por Area
            </Typography>
            {analytics.by_area && analytics.by_area.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <svg width="100%" height={AREA_CHART_H} viewBox={`0 0 ${AREA_CHART_W} ${AREA_CHART_H}`} style={{ display: 'block' }}>
                  {analytics.by_area.map((a, i) => {
                    const y = AREA_PADDING.top + i * 40;
                    const barW = (a.count / areaMaxCount) * (AREA_CHART_W - AREA_PADDING.left - AREA_PADDING.right);
                    return (
                      <g key={a.area_name}>
                        <text x={AREA_PADDING.left - 8} y={y + 14} textAnchor="end" fontSize={11} fill="#374151" fontFamily={theme.typography.fontFamily}>
                          {a.area_name}
                        </text>
                        <rect x={AREA_PADDING.left} y={y} width={barW} height={24} rx={6} fill="#0d9488" opacity={0.8} />
                        <text x={AREA_PADDING.left + barW + 6} y={y + 16} fontSize={10} fill="#6b7280" fontFamily={theme.typography.fontFamily}>
                          {a.count}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 4 }}>
                Sin datos
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Top 5 Tests */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Top 5 Pruebas Mas Solicitadas
            </Typography>
            {analytics.top_tests && analytics.top_tests.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {analytics.top_tests.slice(0, 5).map((t, i) => {
                  const maxCount = analytics.top_tests[0]?.count ?? 1;
                  const pct = (t.count / maxCount) * 100;
                  return (
                    <Box key={t.test_name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                          {i + 1}. {t.test_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {t.count}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 3, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: '#0d9488', transition: 'width 0.3s' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 3 }}>Sin datos</Typography>
            )}
          </Paper>
        </Grid>

        {/* Priority Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Distribucion por Prioridad
            </Typography>
            {analytics.by_priority && analytics.by_priority.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {analytics.by_priority.map((p) => {
                  const total = analytics.by_priority.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? (p.count / total) * 100 : 0;
                  const colors: Record<string, string> = {
                    low: '#6b7280',
                    normal: '#3b82f6',
                    urgent: '#f59e0b',
                    emergency: '#ef4444',
                  };
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
                            backgroundColor: `${colors[p.priority] ?? '#6b7280'}15`,
                            color: colors[p.priority] ?? '#6b7280',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {p.count} ({pct.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 4,
                            backgroundColor: colors[p.priority] ?? '#6b7280',
                            transition: 'width 0.3s',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 3 }}>Sin datos</Typography>
            )}
          </Paper>
        </Grid>

        {/* Requests by Doctor Table */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Solicitudes por Doctor
            </Typography>
            {analytics.by_doctor && analytics.by_doctor.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Doctor</TableCell>
                      <TableCell align="right">Solicitudes</TableCell>
                      <TableCell align="right">Tiempo Prom.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.by_doctor.map((d) => (
                      <TableRow key={d.doctor_name} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                            {d.doctor_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {d.count}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {(d as { avg_time_min?: number }).avg_time_min?.toFixed(1) ?? '—'} min
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 3 }}>
                Sin datos de doctores
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default memo(LabAnalyticsPage);
