import { memo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
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
  const navigate = useNavigate();
  const { t } = useTranslation('lab_area_dashboard');
  const theme = useTheme();
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

  if (dashLoading) return <LoadingState message={t('loading_area')} />;
  if (dashError) return <ErrorState error={dashError as Error} onRetry={() => void refetchDash()} />;
  if (!areaDashboard) return <ErrorState variant="notFound" />;

  const area = areaDashboard.area;
  const metrics = areaDashboard.metrics;

  const metricCards = [
    { label: t('pending'), value: metrics?.pending ?? 0, icon: <HourglassEmpty />, color: theme.palette.warning.dark, bgColor: theme.palette.custom.status.warning.bg },
    { label: t('in_progress'), value: metrics?.in_progress ?? 0, icon: <Autorenew />, color: theme.palette.info.dark, bgColor: theme.palette.custom.status.info.bg },
    { label: t('validated'), value: metrics?.validated ?? 0, icon: <CheckCircleOutline />, color: theme.palette.primary.main, bgColor: theme.palette.custom.brand.lightest },
    { label: t('urgent'), value: metrics?.urgent ?? 0, icon: <PriorityHigh />, color: theme.palette.error.main, bgColor: theme.palette.custom.status.error.bg },
    { label: t('sla_breached'), value: metrics?.sla_breached ?? 0, icon: <TimerOff />, color: theme.palette.error.dark, bgColor: theme.palette.custom.status.error.bg },
  ];

  const recentQc = qcRecords?.slice(0, 5) ?? [];

  return (
    <Box>
      <PageHeader
        title={area.name || t('area_label', { id: area.id })}
        subtitle={t('area_panel', { code: area.code })}
        action={
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/laboratory')}
            sx={{ color: theme.palette.text.secondary }}
          >
            {t('back')}
          </Button>
        }
      />

      {/* Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metricCards.map((stat) => (
          <Grid xs={6} sm={4} md={2.4} key={stat.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '14px',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar sx={{ width: 40, height: 40, backgroundColor: stat.bgColor, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
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
          sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main } }}
        >
          {t('sample_reception')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<FactCheckIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/laboratory/quality-control')}
          sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main } }}
        >
          {t('quality_control')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<InventoryIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/laboratory/quality-control')}
          sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main } }}
        >
          {t('inventory')}
        </Button>
      </Box>

      {/* Two-column layout */}
      <Grid container spacing={3}>
        {/* Left: Work Queue + Result Entry */}
        <Grid xs={12} md={8}>
          <WorkQueue
            requests={queue}
            onSelectRequest={handleSelectRequest}
            selectedId={selectedRequestId ?? undefined}
            isLoading={dashLoading}
          />
        </Grid>

        {/* Right: Equipment + QC */}
        <Grid xs={12} md={4}>
          {/* Equipment Status */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('equipment')}
            </Typography>
            {eqLoading ? (
              <LoadingState message={t('loading_equipment')} />
            ) : equipment && equipment.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {equipment.slice(0, 5).map((eq) => (
                  <EquipmentCard key={eq.id} equipment={eq} />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <ScienceIcon sx={{ fontSize: 32, color: theme.palette.divider, mb: 1 }} />
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {t('no_equipment')}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Recent QC Results */}
          <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('recent_qc_results')}
            </Typography>
            {qcLoading ? (
              <LoadingState message={t('loading_qc')} />
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
                      border: `1px solid ${theme.palette.custom.surface.sunken}`,
                      backgroundColor: theme.palette.custom.surface.muted,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                        {qc.control_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {t('lot_label', { number: qc.lot_number })}
                      </Typography>
                    </Box>
                    <Chip
                      label={qc.status === 'passed' ? t('qc_passed') : qc.status === 'failed' ? t('qc_failed') : qc.status === 'warning' ? t('qc_warning') : t('qc_review')}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor:
                          qc.status === 'passed' ? theme.palette.custom.status.success.bg :
                          qc.status === 'failed' ? theme.palette.custom.status.error.bg :
                          theme.palette.custom.status.warning.bg,
                        color:
                          qc.status === 'passed' ? theme.palette.custom.status.success.text :
                          qc.status === 'failed' ? theme.palette.custom.status.error.text :
                          theme.palette.warning.dark,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <EmptyState
                title={t('no_qc_records')}
                message={t('no_qc_records_message')}
              />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default memo(LabAreaDashboardPage);
