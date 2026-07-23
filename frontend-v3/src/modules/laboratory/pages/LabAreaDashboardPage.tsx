import { memo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ScienceIcon from '@mui/icons-material/Science';
import InventoryIcon from '@mui/icons-material/Inventory';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import Autorenew from '@mui/icons-material/Autorenew';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import PriorityHigh from '@mui/icons-material/PriorityHigh';
import TimerOff from '@mui/icons-material/TimerOff';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAreaDashboard, useLabEquipment, useQCRecords, useLabRequests } from '../hooks/useLab';
import { WorkQueue } from '../components/dashboard/WorkQueue';
import { EquipmentCard } from '../components/EquipmentCard';
import type { LabRequest } from '../types/lab.types';

function LabAreaDashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { areaId } = useParams<{ areaId: string }>();
  const numericAreaId = Number(areaId);

  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const {
    data: areaDashboard,
    isLoading: dashLoading,
    error: dashError,
    refetch: refetchDash,
  } = useAreaDashboard(numericAreaId);

  const { data: equipment, isLoading: eqLoading } = useLabEquipment({ areaId: numericAreaId });
  const { data: qcRecords, isLoading: qcLoading } = useQCRecords({ areaId: numericAreaId });
  const { data: requestsData } = useLabRequests({ area_id: numericAreaId, limit: 50 });

  const queue: LabRequest[] = areaDashboard?.queue ?? requestsData?.data ?? [];

  const handleSelectRequest = useCallback(
    (id: number) => {
      setSelectedRequestId(id);
      navigate(`/laboratory/requests/${id}`);
    },
    [navigate],
  );

  if (dashLoading) return <LoadingState message="Cargando area de laboratorio..." />;
  if (dashError) return <ErrorState error={dashError as Error} onRetry={() => void refetchDash()} />;
  if (!areaDashboard) return <ErrorState variant="notFound" />;

  const area = areaDashboard.area;
  const metrics = areaDashboard.metrics;

  const metricCards = [
    { label: 'Pendientes', value: metrics?.pending ?? 0, icon: <HourglassEmpty />, color: '#d97706', bgColor: '#fffbeb' },
    { label: 'En Progreso', value: metrics?.in_progress ?? 0, icon: <Autorenew />, color: '#2563eb', bgColor: '#eff6ff' },
    { label: 'Validados', value: metrics?.validated ?? 0, icon: <CheckCircleOutline />, color: '#0d9488', bgColor: '#f0fdfa' },
    { label: 'Urgentes', value: metrics?.urgent ?? 0, icon: <PriorityHigh />, color: '#ef4444', bgColor: '#fef2f2' },
    { label: 'SLA Vencido', value: metrics?.sla_breached ?? 0, icon: <TimerOff />, color: '#dc2626', bgColor: '#fef2f2' },
  ];

  const recentQc = qcRecords?.slice(0, 5) ?? [];

  return (
    <Box>
      <PageHeader
        title={area.name || `Area #${area.id}`}
        subtitle={`${area.code} — Panel del area`}
        action={
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/laboratory')}
            sx={{ color: '#6b7280' }}
          >
            Volver
          </Button>
        }
      />

      {/* Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metricCards.map((stat) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={stat.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar sx={{ width: 40, height: 40, backgroundColor: stat.bgColor, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<AssignmentIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/laboratory/requests')}
          sx={{ borderColor: '#e5e7eb', color: '#374151', '&:hover': { borderColor: '#0d9488', color: '#0d9488' } }}
        >
          Recepcion de Muestras
        </Button>
        <Button
          variant="outlined"
          startIcon={<FactCheckIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/laboratory/quality-control')}
          sx={{ borderColor: '#e5e7eb', color: '#374151', '&:hover': { borderColor: '#0d9488', color: '#0d9488' } }}
        >
          Control de Calidad
        </Button>
        <Button
          variant="outlined"
          startIcon={<InventoryIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/laboratory/quality-control')}
          sx={{ borderColor: '#e5e7eb', color: '#374151', '&:hover': { borderColor: '#0d9488', color: '#0d9488' } }}
        >
          Inventario
        </Button>
      </Box>

      {/* Two-column layout */}
      <Grid container spacing={3}>
        {/* Left: Work Queue + Result Entry */}
        <Grid size={{ xs: 12, md: 8 }}>
          <WorkQueue
            requests={queue}
            onSelectRequest={handleSelectRequest}
            selectedId={selectedRequestId ?? undefined}
            isLoading={dashLoading}
          />
        </Grid>

        {/* Right: Equipment + QC */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Equipment Status */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Equipamiento
            </Typography>
            {eqLoading ? (
              <LoadingState message="Cargando equipos..." />
            ) : equipment && equipment.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {equipment.slice(0, 5).map((eq) => (
                  <EquipmentCard key={eq.id} equipment={eq} />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <ScienceIcon sx={{ fontSize: 32, color: '#d1d5db', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Sin equipamiento registrado
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Recent QC Results */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Resultados QC Recientes
            </Typography>
            {qcLoading ? (
              <LoadingState message="Cargando QC..." />
            ) : recentQc.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentQc.map((qc) => (
                  <Box
                    key={qc.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid #f3f4f6',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                        {qc.control_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        Lote: {qc.lot_number}
                      </Typography>
                    </Box>
                    <Chip
                      label={qc.status === 'passed' ? 'Pasado' : qc.status === 'failed' ? 'Fallido' : qc.status === 'warning' ? 'Alerta' : 'Revision'}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor:
                          qc.status === 'passed' ? '#ecfdf5' :
                          qc.status === 'failed' ? '#fef2f2' :
                          '#fffbeb',
                        color:
                          qc.status === 'passed' ? '#059669' :
                          qc.status === 'failed' ? '#dc2626' :
                          '#d97706',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <EmptyState
                title="Sin registros QC"
                message="No hay registros de control de calidad recientes."
              />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default memo(LabAreaDashboardPage);
