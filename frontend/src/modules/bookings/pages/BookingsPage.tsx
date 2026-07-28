import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import CalendarViewWeek from '@mui/icons-material/CalendarViewWeek';
import ViewList from '@mui/icons-material/ViewList';
import Visibility from '@mui/icons-material/Visibility';
import EventBusy from '@mui/icons-material/EventBusy';
import { motion } from 'framer-motion';
import { useAuth } from '@/shared/providers/AuthProvider';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useMyBookings, useDoctorBookings, useAllBookings, useCancelBooking } from '../hooks/useBookings';
import { useDoctorList } from '@/modules/doctors/hooks/useDoctors';
import { BookingCalendar } from '../components/BookingCalendar';
import { CreateBookingDialog } from '../components/CreateBookingDialog';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import type { Booking, BookingListParams, BookingStatus } from '../types/booking.types';
import { BOOKING_STATUS_CONFIG, BOOKING_STATUS_OPTIONS } from '../types/booking.types';
import { useCreateBooking } from '../hooks/useBookings';
import { formatDate } from '@/shared/utils/localeUtils';

const MotionBox = motion(Box);

export default function BookingsPage() {
  const { t } = useTranslation('bookings');
  const theme = useTheme();
  const { user } = useAuth();
  const role = user?.role;

  // State
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const limit = 10;

  // Fetch doctor list for CreateBookingDialog
  const { data: doctorsData, isLoading: isLoadingDoctors } = useDoctorList({ page: 1, limit: 100 });
  const doctors = useMemo(() => {
    if (!doctorsData?.data) return [];
    return doctorsData.data.map((d: { id: number; name: string; specialty?: string }) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
    }));
  }, [doctorsData]);

  // Build query params
  const queryParams = useMemo<BookingListParams>(() => {
    const params: BookingListParams = { page, limit };
    if (statusFilter !== 'all') {
      params.status = statusFilter as BookingStatus;
    }
    return params;
  }, [page, statusFilter, limit]);

  // Queries based on role
  const patientQuery = useMyBookings(
    role === 'patient' ? queryParams : undefined,
  );
  const doctorQuery = useDoctorBookings(
    role === 'doctor' ? queryParams : undefined,
  );
  const adminQuery = useAllBookings(
    role === 'admin' || role === 'superadmin' ? queryParams : undefined,
  );

  // Pick the right query
  const activeQuery = useMemo(() => {
    switch (role) {
      case 'patient':
        return patientQuery;
      case 'doctor':
        return doctorQuery;
      case 'admin':
      case 'superadmin':
        return adminQuery;
      default:
        return adminQuery;
    }
  }, [role, patientQuery, doctorQuery, adminQuery]);

  const { data, isLoading, isError, error, refetch } = activeQuery;
  const bookings: Booking[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // Mutations
  const cancelMutation = useCancelBooking();
  const createMutation = useCreateBooking();

  // Handlers
  const handleStatusFilter = useCallback((status: BookingStatus | 'all') => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handleEventClick = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  }, []);

  const handleCancelBooking = useCallback(
    (id: number) => {
      cancelMutation.mutate(id, {
        onSuccess: () => {
          setDrawerOpen(false);
          setSelectedBooking(null);
        },
      });
    },
    [cancelMutation],
  );

  const handleCreateBooking = useCallback(
    (data: Parameters<typeof createMutation.mutate>[0]) => {
      createMutation.mutate(data, {
        onSuccess: () => {
          setCreateDialogOpen(false);
        },
      });
    },
    [createMutation],
  );

  // Page title based on role
  const pageTitle = useMemo(() => {
    switch (role) {
      case 'patient':
        return t('my_appointments');
      case 'doctor':
      case 'admin':
      case 'superadmin':
        return t('management_title');
      default:
        return t('management_title');
    }
  }, [role, t]);

  const subtitle = useMemo(() => {
    if (!total) return undefined;
    return t('results_found', { total });
  }, [total, t]);

  // Loading
  if (isLoading) {
    return <LoadingState message={t('loading_bookings')} />;
  }

  // Error
  if (isError) {
    return <ErrorState error={error as Error} onRetry={refetch} />;
  }

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title={pageTitle}
        subtitle={subtitle}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* View toggle (doctor only) */}
            {role === 'doctor' && (
              <Box sx={{ display: 'flex', border: `1px solid ${theme.palette.divider}`, borderRadius: '8px', overflow: 'hidden' }}>
                <Tooltip title={t('list_view_tooltip')}>
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('list')}
                    sx={{
                      borderRadius: 0,
                      color: viewMode === 'list' ? theme.palette.common.white : theme.palette.text.secondary,
                      backgroundColor: viewMode === 'list' ? theme.palette.primary.main : 'transparent',
                      '&:hover': {
                        backgroundColor: viewMode === 'list' ? theme.palette.primary.dark : theme.palette.grey[100],
                      },
                    }}
                  >
                    <ViewList fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('calendar_view_tooltip')}>
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('calendar')}
                    sx={{
                      borderRadius: 0,
                      color: viewMode === 'calendar' ? theme.palette.common.white : theme.palette.text.secondary,
                      backgroundColor: viewMode === 'calendar' ? theme.palette.primary.main : 'transparent',
                      '&:hover': {
                        backgroundColor: viewMode === 'calendar' ? theme.palette.primary.dark : theme.palette.grey[100],
                      },
                    }}
                  >
                    <CalendarViewWeek fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* New booking button */}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                },
                px: 3,
                py: 1,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {t('newAppointment', 'Nueva Cita')}
            </Button>
          </Box>
        }
      />

      {/* Status filter chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {BOOKING_STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            clickable
            onClick={() => handleStatusFilter(opt.value)}
            variant={statusFilter === opt.value ? 'filled' : 'outlined'}
            sx={{
              borderColor: theme.palette.grey[300],
              fontWeight: statusFilter === opt.value ? 600 : 400,
              backgroundColor:
                statusFilter === opt.value
                  ? BOOKING_STATUS_CONFIG[opt.value === 'all' ? 'pending' : opt.value as BookingStatus]?.bgColor ?? theme.palette.primary.main
                  : 'transparent',
              color:
                statusFilter === opt.value
                  ? BOOKING_STATUS_CONFIG[opt.value === 'all' ? 'pending' : opt.value as BookingStatus]?.color ?? theme.palette.common.white
                  : theme.palette.text.secondary,
              '&.MuiChip-filled': {
                backgroundColor:
                  opt.value === 'all' && statusFilter === 'all'
                    ? theme.palette.primary.main
                    : undefined,
                color: opt.value === 'all' && statusFilter === 'all' ? theme.palette.common.white : undefined,
              },
            }}
          />
        ))}
      </Box>

      {/* Content */}
      {bookings.length === 0 ? (
        <EmptyState
          icon={<EventBusy sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
          title={t('no_appointments_title')}
          message={
            statusFilter !== 'all'
              ? t('no_appointments_filtered', { status: BOOKING_STATUS_CONFIG[statusFilter as BookingStatus]?.label })
              : t('no_appointments_empty')
          }
          action={{
            label: t('schedule_appointment'),
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : viewMode === 'calendar' && role === 'doctor' ? (
        <Paper
          sx={{
            p: 2,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '12px',
          }}
        >
          <BookingCalendar bookings={bookings} onEventClick={handleEventClick} />
        </Paper>
      ) : (
        /* List view */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onView={() => handleEventClick(booking)}
              t={t}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                sx={{ borderColor: theme.palette.grey[300], color: theme.palette.text.secondary, textTransform: 'none' }}
              >
                {t('previous_page')}
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {t('page_of', { page, total: totalPages })}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                sx={{ borderColor: theme.palette.grey[300], color: theme.palette.text.secondary, textTransform: 'none' }}
              >
                {t('next_page')}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Create dialog */}
      <CreateBookingDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateBooking}
        isSubmitting={createMutation.isPending}
        doctors={doctors}
        isLoadingDoctors={isLoadingDoctors}
        isAuthenticated={!!user}
      />

      {/* Detail drawer */}
      <BookingDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        onCancel={handleCancelBooking}
        isCancelling={cancelMutation.isPending}
      />
    </MotionBox>
  );
}

// --- Booking card sub-component ---

interface BookingCardProps {
  booking: Booking;
  onView: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function BookingCard({ booking, onView, t }: BookingCardProps) {
  const theme = useTheme();
  const FALLBACK_STATUS = { label: t('unknown_status'), color: theme.palette.text.secondary, bgColor: theme.palette.grey[100] };
  const statusConfig = BOOKING_STATUS_CONFIG[booking.status] ?? { ...FALLBACK_STATUS };
  const patientLabel = booking.patient_name || booking.guest_name || t('without_name');

  return (
    <Paper
      sx={{
        p: 2.5,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderColor: theme.palette.grey[300],
        },
      }}
    >
      {/* Date block */}
      <Box
        sx={{
          minWidth: 64,
          textAlign: 'center',
          backgroundColor: statusConfig.bgColor,
          borderRadius: '10px',
          py: 1,
          px: 1.5,
        }}
      >
        <Typography variant="caption" sx={{ color: statusConfig.color, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
          {formatDate(new Date(booking.date + 'T00:00:00'), { weekday: 'short' })}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
          {new Date(booking.date + 'T00:00:00').getDate()}
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
          {booking.time}
        </Typography>
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {patientLabel}
        </Typography>
        {booking.doctor_name && (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Dr. {booking.doctor_name}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {booking.duration} min
          {booking.notes ? ` · ${booking.notes.substring(0, 50)}${booking.notes.length > 50 ? '...' : ''}` : ''}
        </Typography>
      </Box>

      {/* Status + actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          label={statusConfig.label}
          size="small"
          sx={{
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.color,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
        <Tooltip title={t('view_detail_tooltip')}>
          <IconButton
            size="small"
            onClick={onView}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.success.light },
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
