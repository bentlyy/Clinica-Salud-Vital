import { useState, useEffect } from 'react';
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
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { apiClient } from '@/shared/services/api-client';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface LabItem {
  id: number;
  test_name: string;
  result_value?: string;
  test_id: number;
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
  in_progress: { color: 'warning', label: 'En progreso' },
  pending: { color: 'warning', label: 'Pendiente' },
  cancelled: { color: 'default', label: 'Cancelado' },
};

const DEFAULT_STATUS: StatusConfigEntry = { color: 'default', label: 'Desconocido' };

function getStatusConfig(status: string): StatusConfigEntry {
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS;
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
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/lab/requests', {
        params: { limit: 50 },
      });
      setRequests(
        Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data as LabRequest[] : []),
      );
    } catch {
      setError(t('lab_results.error_loading', 'Error al cargar resultados'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  if (loading) {
    return <LoadingState message={t('lab_results.loading', 'Cargando resultados...')} />;
  }

  if (error) {
    return <EmptyState title={error} message="" />;
  }

  if (requests.length === 0) {
    return (
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title={t('lab_results.title', 'Mis Resultados de Laboratorio')}
          subtitle={t('lab_results.subtitle', 'Consulta tus exámenes y resultados')}
        />
        <EmptyState
          icon={<ScienceIcon sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('lab_results.empty_title', 'Sin resultados')}
          message={t(
            'lab_results.empty_desc',
            'Aún no tienes resultados de laboratorio disponibles.',
          )}
        />
      </MotionDiv>
    );
  }

  const completed = requests.filter((r) => r.status === 'completed');
  const pending = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress',
  );
  const totalItems = requests.reduce((s, r) => s + r.items.length, 0);
  const completedItems = requests.reduce(
    (s, r) => s + r.items.filter((i) => i.result_value).length,
    0,
  );

  const statCards: StatCard[] = [
    {
      label: t('lab_results.total', 'Total Solicitudes'),
      value: requests.length,
      icon: '📋',
      bg: theme.palette.custom.status.info.bg,
    },
    {
      label: t('lab_results.completed', 'Completados'),
      value: completed.length,
      icon: '✅',
      bg: theme.palette.custom.status.success.bg,
      color: theme.palette.success.main,
    },
    {
      label: t('lab_results.pending', 'Pendientes'),
      value: pending.length,
      icon: '⏳',
      bg: theme.palette.custom.status.warning.bg,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('lab_results.title', 'Mis Resultados de Laboratorio')}
        subtitle={t('lab_results.subtitle', 'Consulta tus exámenes y resultados')}
      />

      {/* ── Summary Stats ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid key={stat.label} xs={12} sm={4}>
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
            {t('lab_results.pending_section', 'Pendientes')} ({pending.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={1.5}>
            {pending.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onClick={() => navigate(`/patient/laboratory/${String(r.id)}`)}
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
            {t('lab_results.completed_section', 'Completados')} ({completed.length})
          </Typography>
          <Box display="flex" flexDirection="column" gap={1.5}>
            {completed.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onClick={() => navigate(`/patient/laboratory/${String(r.id)}`)}
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
  const statusCfg = getStatusConfig(request.status);
  const testNames = request.items
    .map((i) => i.test_name)
    .filter(Boolean)
    .join(', ');

  const withResult = request.items.filter((i) => i.result_value).length;

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
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
            <Typography fontWeight={600} gutterBottom>
              {testNames || `Solicitud #${String(request.id)}`}
            </Typography>
            <Box display="flex" gap={2} color="text.secondary" fontSize={13}>
              <span>
                📅 {request.created_at?.split('T')[0] ?? '-'}
              </span>
              {request.doctor_name && <span>🩺 {request.doctor_name}</span>}
              <span>
                🧪 {withResult}/{request.items.length} resultados
              </span>
            </Box>
            {request.items.length > 0 && (
              <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                {request.items.slice(0, 4).map((item) => (
                  <Chip
                    key={item.id}
                    size="small"
                    label={`${item.test_name}${item.result_value ? `: ${item.result_value}` : ''}`}
                    sx={{
                      fontSize: 11,
                      bgcolor: item.result_value ? theme.palette.custom.status.success.bg : theme.palette.custom.status.warning.bg,
                      color: item.result_value ? theme.palette.custom.status.success.text : theme.palette.custom.status.warning.text,
                    }}
                  />
                ))}
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
