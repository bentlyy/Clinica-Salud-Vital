import { Box, Typography, Paper, Avatar, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import Autorenew from '@mui/icons-material/Autorenew';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Verified from '@mui/icons-material/Verified';
import AccessTime from '@mui/icons-material/AccessTime';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import Science from '@mui/icons-material/Science';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLabDashboard, useLabRequests, useLabEquipment, useLabSSE } from '../hooks/useLab';
import { LabPipeline } from '../components/LabPipeline';
import { EquipmentCard } from '../components/EquipmentCard';
import { LabSSEProvider } from '../components/LabSSEProvider';
import { MotionDiv } from '@/shared/utils/animations';
import type { LabRequest } from '../types/lab.types';

function LabDashboardContent() {
  const { user } = useAuth();
  const { events, isConnected } = useLabSSE();
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useLabDashboard();
  const { data: requestsData, isLoading: requestsLoading, error: requestsError, refetch: refetchRequests } = useLabRequests({ limit: 50 });
  const { data: equipment, isLoading: equipmentLoading } = useLabEquipment();

  const requests: LabRequest[] = requestsData?.data ?? [];

  if (metricsLoading || requestsLoading) return <LoadingState message="Cargando panel de laboratorio..." />;
  if (metricsError) return <ErrorState error={metricsError as Error} onRetry={() => void refetchMetrics()} />;
  if (requestsError) return <ErrorState error={requestsError as Error} onRetry={() => void refetchRequests()} />;

  const metricCards = [
    {
      label: 'Pendientes',
      value: metrics?.pending_requests ?? 0,
      icon: <HourglassEmpty />,
      color: '#d97706',
      bgColor: '#fffbeb',
    },
    {
      label: 'En Progreso',
      value: metrics?.in_progress ?? 0,
      icon: <Autorenew />,
      color: '#2563eb',
      bgColor: '#eff6ff',
    },
    {
      label: 'Completados Hoy',
      value: metrics?.completed_today ?? 0,
      icon: <CheckCircleOutline />,
      color: '#0d9488',
      bgColor: '#f0fdfa',
    },
    {
      label: 'Validados Hoy',
      value: metrics?.validated_today ?? 0,
      icon: <Verified />,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
    },
  ];

  const recentEvents = events.slice(0, 5);

  return (
    <Box>
      <PageHeader
        title="Laboratorio"
        subtitle={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            {`Bienvenido, ${user?.name || 'Técnico'} — Panel de control del laboratorio`}
            {isConnected && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: '12px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 500, lineHeight: 1 }}>
                  En línea
                </Typography>
              </Box>
            )}
          </Box>
        }
      />

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metricCards.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    backgroundColor: stat.bgColor,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Paper>
            </MotionDiv>
          </Grid>
        ))}
      </Grid>

      {/* Average turnaround */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid #e5e7eb' }}>
        <AccessTime sx={{ color: '#0d9488' }} />
        <Typography variant="body2" sx={{ color: '#374151' }}>
          Tiempo promedio de procesamiento:{' '}
          <strong>{metrics?.avg_turnaround_hours?.toFixed(1) ?? '—'} horas</strong>
        </Typography>
      </Paper>

      {/* Real-time notifications */}
      {recentEvents.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <NotificationsActive sx={{ fontSize: 18, color: '#0d9488' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
              Notificaciones Recientes
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {recentEvents.map((evt, i) => (
              <Alert key={i} severity="info" sx={{ py: 0, '& .MuiAlert-message': { py: '4px' } }}>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {evt.type}: {typeof evt.payload === 'object' ? JSON.stringify(evt.payload) : String(evt.payload)}
                </Typography>
              </Alert>
            ))}
          </Box>
        </Paper>
      )}

      {/* Pipeline */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
          Pipeline de Solicitudes
        </Typography>
        <LabPipeline requests={requests} />
      </Box>

      {/* Equipment */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
          Estado del Equipamiento
        </Typography>
        {equipmentLoading ? (
          <LoadingState message="Cargando equipamiento..." />
        ) : equipment && equipment.length > 0 ? (
          <Grid container spacing={2}>
            {equipment.map((eq) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={eq.id}>
                <EquipmentCard equipment={eq} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed #e5e7eb',
            }}
          >
            <Science sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No hay equipamiento registrado
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

export default function LabDashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'doctor') {
    return <Navigate to="/laboratory/requests" replace />;
  }
  return (
    <LabSSEProvider>
      <LabDashboardContent />
    </LabSSEProvider>
  );
}
