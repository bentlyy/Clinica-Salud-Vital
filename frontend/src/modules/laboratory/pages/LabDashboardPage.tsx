import { memo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TableChartIcon from '@mui/icons-material/TableChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import toast from 'react-hot-toast';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useLabDashboard, useLabRequests, useLabNotifications, useLabSSE, useLabFilters, useLabAreas, useUpdateLabRequestStatus } from '../hooks/useLab';
import { useLabKeyboard, LAB_KEYBOARD_SHORTCUTS } from '../hooks/useLabKeyboard';
import { DashboardMetricsBar } from '../components/dashboard/DashboardMetricsBar';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { KanbanBoard } from '../components/dashboard/KanbanBoard';
import { WorkQueue } from '../components/dashboard/WorkQueue';
import { FiltersBar } from '../components/shared/FiltersBar';
import { LabSSEProvider } from '../components/LabSSEProvider';
import type { LabRequest, LabRequestStatus, LabPriority } from '../types/lab.types';

type ViewMode = 'kanban' | 'table' | 'metrics';

function LabDashboardContent() {
  const navigate = useNavigate();
  const { t } = useTranslation('lab_dashboard');
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [sseNotification, setSseNotification] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const { events, isConnected } = useLabSSE();
  const { filters, updateFilter, resetFilters, hasActiveFilters } = useLabFilters();
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useLabDashboard();
  const { data: requestsData, isLoading: requestsLoading, error: requestsError, refetch: refetchRequests } = useLabRequests({
    limit: 100,
    search: filters.search || undefined,
    status: (filters.status || undefined) as LabRequestStatus | undefined,
    priority: (filters.priority || undefined) as LabPriority | undefined,
    area_id: typeof filters.areaId === 'number' ? filters.areaId : undefined,
  });
  const { data: notifications, isLoading: notifLoading } = useLabNotifications();
  const { data: areas } = useLabAreas();
  const updateStatus = useUpdateLabRequestStatus();

  const requests: LabRequest[] = requestsData?.data ?? [];

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  const refreshAll = useCallback(() => {
    void refetchMetrics();
    void refetchRequests();
  }, [refetchMetrics, refetchRequests]);

  useLabKeyboard([
    { ...LAB_KEYBOARD_SHORTCUTS.refresh, handler: refreshAll },
    { ...LAB_KEYBOARD_SHORTCUTS.kanban, handler: () => setViewMode('kanban') },
    { ...LAB_KEYBOARD_SHORTCUTS.table, handler: () => setViewMode('table') },
    { ...LAB_KEYBOARD_SHORTCUTS.metrics, handler: () => setViewMode('metrics') },
  ]);

  // ── Status Change ─────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    (requestId: number, newStatus: LabRequestStatus) => {
      updateStatus.mutate(
        { id: requestId, status: newStatus },
        {
          onSuccess: () => {
            toast.success(t('request_moved', { status: newStatus }));
          },
        },
      );
    },
    [updateStatus],
  );

  // SSE notifications
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      if (!latest) return;
      if (latest.type === 'critical_result') {
        toast.error(t('critical_result', { detail: typeof latest.payload === 'object' ? JSON.stringify(latest.payload) : String(latest.payload) }));
      } else {
        setSseNotification({
          open: true,
          message: `${latest.type}: ${typeof latest.payload === 'object' ? JSON.stringify(latest.payload) : String(latest.payload)}`,
        });
      }
    }
  }, [events]);

  const handleViewChange = useCallback((_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) setViewMode(newMode);
  }, []);

  const handleSelectRequest = useCallback(
    (id: number) => {
      navigate(`/laboratory/requests/${id}`);
    },
    [navigate],
  );

  const handleNavigateToArea = useCallback(
    (areaId: number) => {
      navigate(`/laboratory/area/${areaId}`);
    },
    [navigate],
  );

  if (metricsLoading || requestsLoading) return <LoadingState message={t('loading_panel')} />;
  if (metricsError) return <ErrorState error={metricsError as Error} onRetry={() => void refetchMetrics()} />;
  if (requestsError) return <ErrorState error={requestsError as Error} onRetry={() => void refetchRequests()} />;

  const viewModeButtons = (
    <ToggleButtonGroup
      value={viewMode}
      exclusive
      onChange={handleViewChange}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          border: `1px solid ${theme.palette.divider}`,
          px: 1.5,
          py: 0.75,
          '&.Mui-selected': {
            backgroundColor: theme.palette.custom.brand.lightest,
            color: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.custom.brand.lighter },
          },
        },
      }}
    >
      <ToggleButton value="kanban">
        <ViewKanbanIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
      <ToggleButton value="table">
        <TableChartIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
      <ToggleButton value="metrics">
        <DashboardIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            {t('requests_in_queue', { count: requests.length })}
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
                  backgroundColor: theme.palette.custom.status.success.bg,
                  border: `1px solid ${theme.palette.custom.status.success.border}`,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: theme.palette.success.main }} />
                <Typography variant="caption" sx={{ color: theme.palette.custom.status.success.text, fontWeight: 500, lineHeight: 1 }}>
                  {t('online')}
                </Typography>
              </Box>
            )}
          </Box>
        }
        action={viewModeButtons}
      />

      {/* Metrics Bar */}
      <Box sx={{ mb: 3 }}>
        <DashboardMetricsBar metrics={metrics} isLoading={metricsLoading} />
      </Box>

      {/* Filters */}
      <FiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        areas={areas}
      />

      {/* Alerts Panel */}
      {notifications && notifications.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <AlertsPanel
            notifications={notifications}
            isLoading={notifLoading}
          />
        </Box>
      )}

      {/* Content */}
      <Box sx={{ minHeight: 400 }}>
        {requests.length === 0 ? (
          <EmptyState
            icon={<ScienceIcon sx={{ fontSize: 48, color: theme.palette.divider }} />}
            title={t('no_requests_title')}
            message={t('no_requests_message')}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            requests={requests}
            onSelectRequest={handleSelectRequest}
            onStatusChange={handleStatusChange}
            isLoading={requestsLoading}
          />
        ) : viewMode === 'table' ? (
          <WorkQueue
            requests={requests}
            onSelectRequest={handleSelectRequest}
            isLoading={requestsLoading}
          />
        ) : (
          /* Metrics View — area cards */
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('metrics_by_area')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {areas?.map((area) => {
                const areaRequests = requests.filter((r) => r.lab_area_id === area.id);
                return (
                  <Box
                    key={area.id}
                    onClick={() => handleNavigateToArea(area.id)}
                    sx={{
                      p: 2.5,
                      borderRadius: '14px',
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderColor: `${area.color || theme.palette.primary.main}40`,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${area.color || theme.palette.primary.main}15`,
                          color: area.color || theme.palette.primary.main,
                        }}
                      >
                        <ScienceIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                          {area.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {area.code}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={t('area_requests', { count: areaRequests.length })}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          backgroundColor: theme.palette.custom.surface.sunken,
                          color: theme.palette.text.primary,
                        }}
                      />
                      <Chip
                        label={t('area_in_process', { count: areaRequests.filter((r) => r.status === 'processing').length })}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          backgroundColor: theme.palette.custom.status.info.bg,
                          color: theme.palette.info.dark,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* SSE Notification Snackbar */}
      <Snackbar
        open={sseNotification.open}
        autoHideDuration={6000}
        onClose={() => setSseNotification({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSseNotification({ open: false, message: '' })}
          severity="info"
          sx={{ width: '100%' }}
          variant="filled"
        >
          {sseNotification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function LabDashboardPageInner() {
  return (
    <LabSSEProvider>
      <LabDashboardContent />
    </LabSSEProvider>
  );
}

const LabDashboardPage = memo(LabDashboardPageInner);
export default LabDashboardPage;
