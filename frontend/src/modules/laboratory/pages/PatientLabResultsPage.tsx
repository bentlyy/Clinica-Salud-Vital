import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Card,
  CardActionArea,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ScienceIcon from '@mui/icons-material/Science';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { apiClient } from '@/shared/services/api-client';
import {
  getRangeStatus,
  type ReferenceRanges,
} from '../utils/labRange';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface LabItem {
  id: number;
  test_name: string;
  result_value?: string;
  test_id: number;
  unit?: string | null;
  reference_ranges?: ReferenceRanges | null;
  result_notes?: string | null;
}

interface LabRequest {
  id: number;
  status: string;
  created_at: string;
  doctor_name?: string;
  items: LabItem[];
}

// ── Status config ────────────────────────────────────────────────────────────

interface StatusConfigEntry {
  color: 'success' | 'warning' | 'default' | 'error';
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  completed: { color: 'success', label: 'Completado' },
  delivered: { color: 'success', label: 'Completado' },
  signed: { color: 'success', label: 'Completado' },
  in_progress: { color: 'warning', label: 'En progreso' },
  pending: { color: 'warning', label: 'Pendiente' },
  cancelled: { color: 'default', label: 'Cancelado' },
};

const DEFAULT_STATUS: StatusConfigEntry = { color: 'default', label: 'Desconocido' };

function getStatusConfig(status: string, t: (key: string, fallback: string) => string): StatusConfigEntry {
  const cfg = STATUS_CONFIG[status] ?? DEFAULT_STATUS;
  return { ...cfg, label: t(`lab:statusLabels.${status}`, cfg.label) };
}

function isCompletedStatus(status: string): boolean {
  return status === 'delivered' || status === 'signed' || status === 'completed';
}

function isPendingStatus(status: string): boolean {
  return status === 'pending' || status === 'in_progress';
}

function countOutOfRange(items: LabItem[]): number {
  return items.filter((i) => {
    const status = getRangeStatus(i.result_value, i.reference_ranges);
    return status === 'high' || status === 'low';
  }).length;
}

function isRecentlyPublished(request: LabRequest): boolean {
  if (!isCompletedStatus(request.status)) return false;
  return request.created_at
    ? Date.now() - new Date(request.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;
}

// ── Stats card data ──────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: number;
  icon: string;
  bg: string;
  color?: string;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PatientLabResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  const { data: requests = [], isLoading, error } = useQuery<LabRequest[]>({
    queryKey: ['laboratory', 'patient-results'],
    queryFn: async () => {
      const { data } = await apiClient.get('/laboratory', { params: { limit: 50 } });
      return Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data as LabRequest[] : []);
    },
  });

  if (isLoading) {
    return <LoadingState message={t('lab_results:loading', 'Cargando resultados...')} />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (requests.length === 0) {
    return (
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title={t('lab_results:title', 'Mis Resultados de Laboratorio')}
          subtitle={t('lab_results:subtitle', 'Consulta tus exámenes y resultados')}
        />
        <EmptyState
          icon={<ScienceIcon sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('lab_results:empty_title', 'Sin resultados')}
          message={t('lab_results:empty_desc',
            'Aún no tienes resultados de laboratorio disponibles.',
          )}
        />
      </MotionDiv>
    );
  }

  const completed = requests.filter((r) => isCompletedStatus(r.status));
  const pending = requests.filter((r) => isPendingStatus(r.status));
  const totalItems = requests.reduce((s, r) => s + r.items.length, 0);
  const completedItems = requests.reduce(
    (s, r) => s + r.items.filter((i) => i.result_value).length,
    0,
  );
  const outOfRangeCount = requests.reduce((s, r) => s + countOutOfRange(r.items), 0);

  const statCards: StatCard[] = [
    {
      label: t('lab_results:total', 'Total Solicitudes'),
      value: requests.length,
      icon: '📋',
      bg: theme.palette.custom.status.info.bg,
    },
    {
      label: t('lab_results:completed', 'Completados'),
      value: completed.length,
      icon: '✅',
      bg: theme.palette.custom.status.success.bg,
      color: theme.palette.success.main,
    },
    {
      label: t('lab_results:pending', 'Pendientes'),
      value: pending.length,
      icon: '⏳',
      bg: theme.palette.custom.status.warning.bg,
      color: theme.palette.warning.main,
    },
    {
      label: t('lab_results:out_of_range', 'Fuera de rango'),
      value: outOfRangeCount,
      icon: '⚠️',
      bg: theme.palette.error.light,
      color: theme.palette.error.main,
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('lab_results:title', 'Mis Resultados de Laboratorio')}
        subtitle={t('lab_results:subtitle', 'Consulta tus exámenes y resultados')}
      />

      {/* ── Summary Stats ─────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid key={stat.label} xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textTransform="uppercase"
                    letterSpacing="0.3px"
                  >
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={stat.color}>
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: stat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Pending Requests ──────────────────────────────────────────── */}
      {pending.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            gutterBottom
            display="flex"
            alignItems="center"
            gap={1}
          >
            <PendingIcon sx={{ color: theme.palette.warning.main, fontSize: 18 }} />{' '}
            {t('lab_results:pending_section', 'Pendientes')} ({pending.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={1.5}>
            {pending.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onClick={() => navigate(`/my-laboratory/${String(r.id)}`)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Completed Requests ────────────────────────────────────────── */}
      {completed.length > 0 && (
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            gutterBottom
            display="flex"
            alignItems="center"
            gap={1}
          >
            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 18 }} />{' '}
            {t('lab_results:completed_section', 'Completados')} ({completed.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={1.5}>
            {completed.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onClick={() => navigate(`/my-laboratory/${String(r.id)}`)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Footer Summary ────────────────────────────────────────────── */}
      <Paper
        sx={{
          mt: 3,
          p: 1.5,
          bgcolor: theme.palette.custom.surface.muted,
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: 'text.secondary',
        }}
      >
        <span>
          {totalItems} exámenes en total — {completedItems} con resultados
        </span>
        <span>
          {completedItems}/{totalItems} completados
        </span>
      </Paper>
    </MotionDiv>
  );
}

// ── Request Card ─────────────────────────────────────────────────────────────

interface RequestCardProps {
  request: LabRequest;
  onClick: () => void;
}

function RequestCard({ request, onClick }: RequestCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const statusCfg = getStatusConfig(request.status, t);
  const testNames = request.items
    .map((i) => i.test_name)
    .filter(Boolean)
    .join(', ');

  const withResult = request.items.filter((i) => i.result_value).length;
  const outOfRange = countOutOfRange(request.items);
  const isNew = isRecentlyPublished(request);

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: `1px solid ${outOfRange > 0 ? theme.palette.error.light : theme.palette.divider}`,
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-1px)',
        },
        transition: 'all 0.15s',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={1}
        >
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography fontWeight={600} gutterBottom>
                {testNames || `Solicitud #${String(request.id)}`}
              </Typography>
              {isNew && (
                <Chip
                  size="small"
                  label={t('lab_results:new_badge', 'Nuevo')}
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.common.white,
                  }}
                />
              )}
            </Box>
            <Box display="flex" gap={2} color="text.secondary" fontSize={13}>
              <span>
                📅 {request.created_at?.split('T')[0] ?? '-'}
              </span>
              {request.doctor_name && <span>🩺 {request.doctor_name}</span>}
              <span>
                🧪 {withResult}/{request.items.length} resultados
              </span>
            </Box>
            {outOfRange > 0 && (
              <Box
                mt={1}
                p={1}
                borderRadius={1}
                sx={{
                  bgcolor: theme.palette.error.light,
                  color: theme.palette.error.dark,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ⚠️ {t('lab_results:anomaly_banner', 'Este informe contiene {{count}} valores fuera de rango', { count: outOfRange })}
              </Box>
            )}
            {request.items.length > 0 && (
              <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                {request.items.slice(0, 4).map((item) => {
                  const rangeStatus = getRangeStatus(item.result_value, item.reference_ranges);
                  const isAbnormal = rangeStatus === 'high' || rangeStatus === 'low';
                  const chipBg = isAbnormal
                    ? theme.palette.error.light
                    : item.result_value
                      ? theme.palette.custom.status.success.bg
                      : theme.palette.custom.status.warning.bg;
                  const chipColor = isAbnormal
                    ? theme.palette.error.dark
                    : item.result_value
                      ? theme.palette.custom.status.success.text
                      : theme.palette.custom.status.warning.text;
                  return (
                    <Chip
                      key={item.id}
                      size="small"
                      label={`${item.test_name}${item.result_value ? `: ${item.result_value}` : ''}`}
                      sx={{
                        fontSize: 11,
                        fontWeight: isAbnormal ? 700 : 400,
                        bgcolor: chipBg,
                        color: chipColor,
                      }}
                    />
                  );
                })}
                {request.items.length > 4 && (
                  <Chip
                    size="small"
                    label={`+${String(request.items.length - 4)}`}
                    sx={{ fontSize: 11 }}
                  />
                )}
              </Box>
            )}
          </Box>
          <Chip size="small" color={statusCfg.color} label={statusCfg.label} />
        </Box>
      </CardActionArea>
    </Card>
  );
}
