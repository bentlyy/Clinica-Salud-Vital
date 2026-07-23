import { useState, useCallback, useMemo } from 'react';
import { Box, Button, Chip, Typography, Paper, IconButton, Tooltip } from '@mui/material';
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

const MotionBox = motion(Box);

export default function BookingsPage() {
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
        return 'Mis Citas';
      case 'doctor':
        return 'Gestión de Citas';
      case 'admin':
      case 'superadmin':
        return 'Gestión de Citas';
      default:
        return 'Citas';
    }
  }, [role]);

  const subtitle = useMemo(() => {
    if (!total) return undefined;
    return `${total} cita${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`;
  }, [total]);

  // Loading
  if (isLoading) {
    return <LoadingState message="Cargando citas..." />;
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
              <Box sx={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <Tooltip title="Vista lista">
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('list')}
                    sx={{
                      borderRadius: 0,
                      color: viewMode === 'list' ? '#fff' : '#6b7280',
                      backgroundColor: viewMode === 'list' ? '#0d9488' : 'transparent',
                      '&:hover': {
                        backgroundColor: viewMode === 'list' ? '#0f766e' : '#f3f4f6',
                      },
                    }}
                  >
                    <ViewList fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Vista calendario">
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('calendar')}
                    sx={{
                      borderRadius: 0,
                      color: viewMode === 'calendar' ? '#fff' : '#6b7280',
                      backgroundColor: viewMode === 'calendar' ? '#0d9488' : 'transparent',
                      '&:hover': {
                        backgroundColor: viewMode === 'calendar' ? '#0f766e' : '#f3f4f6',
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
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                },
                px: 3,
                py: 1,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Nueva Cita
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
              borderColor: '#d1d5db',
              fontWeight: statusFilter === opt.value ? 600 : 400,
              backgroundColor:
                statusFilter === opt.value
                  ? BOOKING_STATUS_CONFIG[opt.value === 'all' ? 'pending' : opt.value as BookingStatus]?.bgColor ?? '#0d9488'
                  : 'transparent',
              color:
                statusFilter === opt.value
                  ? BOOKING_STATUS_CONFIG[opt.value === 'all' ? 'pending' : opt.value as BookingStatus]?.color ?? '#fff'
                  : '#374151',
              '&.MuiChip-filled': {
                backgroundColor:
                  opt.value === 'all' && statusFilter === 'all'
                    ? '#0d9488'
                    : undefined,
                color: opt.value === 'all' && statusFilter === 'all' ? '#fff' : undefined,
              },
            }}
          />
        ))}
      </Box>

      {/* Content */}
      {bookings.length === 0 ? (
        <EmptyState
          icon={<EventBusy sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="No hay citas"
          message={
            statusFilter !== 'all'
              ? `No se encontraron citas con estado "${BOOKING_STATUS_CONFIG[statusFilter as BookingStatus]?.label}".`
              : 'Aún no tienes citas registradas.'
          }
          action={{
            label: 'Agendar Cita',
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : viewMode === 'calendar' && role === 'doctor' ? (
        <Paper
          sx={{
            p: 2,
            border: '1px solid #e5e7eb',
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
                sx={{ borderColor: '#d1d5db', color: '#374151', textTransform: 'none' }}
              >
                Anterior
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  Página {page} de {totalPages}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                sx={{ borderColor: '#d1d5db', color: '#374151', textTransform: 'none' }}
              >
                Siguiente
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
}

const FALLBACK_STATUS = { label: 'Desconocido', color: '#6b7280', bgColor: '#f3f4f6' };

function BookingCard({ booking, onView }: BookingCardProps) {
  const statusConfig = BOOKING_STATUS_CONFIG[booking.status] ?? FALLBACK_STATUS;
  const patientLabel = booking.patient_name || booking.guest_name || 'Sin nombre';

  return (
    <Paper
      sx={{
        p: 2.5,
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderColor: '#d1d5db',
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
          {new Date(booking.date + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short' })}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
          {new Date(booking.date + 'T00:00:00').getDate()}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
          {booking.time}
        </Typography>
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f2937' }}>
          {patientLabel}
        </Typography>
        {booking.doctor_name && (
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Dr. {booking.doctor_name}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
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
        <Tooltip title="Ver detalle">
          <IconButton
            size="small"
            onClick={onView}
            sx={{
              color: '#0d9488',
              '&:hover': { backgroundColor: '#f0fdfa' },
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}
