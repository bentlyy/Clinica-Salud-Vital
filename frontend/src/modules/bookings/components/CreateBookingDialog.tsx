import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Close from '@mui/icons-material/Close';
import PersonOutline from '@mui/icons-material/PersonOutline';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import CalendarToday from '@mui/icons-material/CalendarToday';
import AccessTime from '@mui/icons-material/AccessTime';
import MedicalServices from '@mui/icons-material/MedicalServices';
import Repeat from '@mui/icons-material/Repeat';
import Add from '@mui/icons-material/Add';
import Remove from '@mui/icons-material/Remove';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAvailableSlots } from '../hooks/useBookings';
import { useJoinWaitlist } from '@/modules/waitlist/hooks/useWaitlist';
import type { CreateBookingInput, CreateBookingSeriesInput, RecurrenceFrequency } from '../types/booking.types';

function createBookingSchema(t: (key: string) => string) {
  return z.object({
    doctor_id: z.number({ required_error: t('select_doctor') }).min(1, t('select_doctor')),
    date: z.string().min(1, t('select_date')),
    time: z.string().min(1, t('select_time')),
    duration: z.number().optional(),
    guest_name: z.string().optional(),
    guest_email: z.string().email(t('invalid_email')).optional().or(z.literal('')),
    guest_phone: z.string().optional(),
    notes: z.string().optional(),
    is_recurring: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    occurrences: z.number().min(1).max(52).optional(),
  });
}

interface Doctor {
  id: number;
  name: string;
  specialty?: string;
}

interface CreateBookingDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBookingInput) => void;
  onSubmitSeries?: (data: CreateBookingSeriesInput) => void;
  isSubmitting: boolean;
  doctors: Doctor[];
  isLoadingDoctors: boolean;
  isAuthenticated?: boolean;
}

export function CreateBookingDialog({
  open,
  onClose,
  onSubmit,
  onSubmitSeries,
  isSubmitting,
  doctors,
  isLoadingDoctors,
  isAuthenticated = false,
}: CreateBookingDialogProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { t } = useTranslation('bookings');
  const { t: tc } = useTranslation('common');
  const theme = useTheme();
  const joinWaitlist = useJoinWaitlist();

  const bookingSchema = createBookingSchema(t);
  type BookingFormData = z.infer<typeof bookingSchema>;

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      doctor_id: 0,
      date: '',
      time: '',
      duration: 30,
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      notes: '',
      is_recurring: false,
      frequency: 'weekly',
      occurrences: 4,
    },
  });

  const watchedDoctorId = watch('doctor_id');
  const watchedDate = watch('date');
  const watchedIsRecurring = watch('is_recurring');

  useEffect(() => {
    setSelectedDoctorId(watchedDoctorId || null);
  }, [watchedDoctorId]);

  useEffect(() => {
    setSelectedDate(watchedDate || '');
  }, [watchedDate]);

  const {
    data: slotsData,
    isLoading: isLoadingSlots,
  } = useAvailableSlots(selectedDoctorId, selectedDate || null);

  const availableSlots: string[] = Array.isArray(slotsData) ? slotsData : [];

  const handleFormSubmit = (data: BookingFormData) => {
    if (data.is_recurring && onSubmitSeries && data.frequency && data.time && data.date) {
      const seriesInput: CreateBookingSeriesInput = {
        doctor_id: data.doctor_id,
        frequency: data.frequency,
        interval_count: 1,
        start_date: data.date,
        time: data.time,
        duration: data.duration ?? 30,
        occurrences: data.occurrences ?? 4,
      };
      onSubmitSeries(seriesInput);
      return;
    }

    const input: CreateBookingInput = {
      doctor_id: data.doctor_id,
      date: data.date,
      time: data.time,
      duration: data.duration ?? 30,
    };

    if (!isAuthenticated) {
      if (data.guest_name) input.guest_name = data.guest_name;
      if (data.guest_email) input.guest_email = data.guest_email;
      if (data.guest_phone) input.guest_phone = data.guest_phone;
    }

    if (data.notes) input.notes = data.notes;

    onSubmit(input);
  };

  const handleClose = () => {
    reset();
    setSelectedDoctorId(null);
    setSelectedDate('');
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {t('new_booking')}
        </Typography>
        <Button onClick={handleClose} sx={{ minWidth: 'auto', p: 1 }}>
          <Close sx={{ color: theme.palette.text.secondary }} />
        </Button>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Doctor selector */}
            <Controller
              name="doctor_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={doctors}
                  loading={isLoadingDoctors}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_event, newValue) => {
                    field.onChange(newValue?.id ?? 0);
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.name}
                        </Typography>
                        {option.specialty && (
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            {option.specialty}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={tc('common:doctor', 'Doctor')}
                      placeholder={t('search_doctor')}
                      error={!!errors.doctor_id}
                      helperText={errors.doctor_id?.message}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          startAdornment: (
                            <MedicalServices
                              sx={{ color: theme.palette.text.secondary, fontSize: 20, mr: 1 }}
                            />
                          ),
                        },
                      }}
                    />
                  )}
                />
              )}
            />

            {/* Date picker */}
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label={t('date')}
                  fullWidth
                  error={!!errors.date}
                  helperText={errors.date?.message}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <CalendarToday
                          sx={{ color: theme.palette.text.secondary, fontSize: 20, mr: 1 }}
                        />
                      ),
                    },
                  }}
                  inputProps={{ min: today }}
                />
              )}
            />

            {/* Time slots */}
            {selectedDoctorId && selectedDate && (
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: theme.palette.text.secondary, mb: 1 }}
                >
                  <AccessTime
                    sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }}
                  />
                  {t('available_slots')}
                </Typography>
                {isLoadingSlots ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
                  </Box>
                ) : availableSlots.length === 0 ? (
                  <Box>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, py: 1 }}>
                      {t('no_slots_available')}
                    </Typography>
                    {isAuthenticated && selectedDoctorId && selectedDate && (
                      <Button
                        variant="outlined"
                        color="primary"
                        disabled={joinWaitlist.isPending}
                        onClick={() =>
                          joinWaitlist.mutate({ doctorId: selectedDoctorId, date: selectedDate })
                        }
                        sx={{ textTransform: 'none' }}
                      >
                        {joinWaitlist.isPending
                          ? tc('loading')
                          : t('join_waitlist', { defaultValue: 'Unirme a lista de espera' })}
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Controller
                    name="time"
                    control={control}
                    render={({ field }) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {availableSlots.map((slot) => (
                          <Chip
                            key={slot}
                            label={slot}
                            clickable
                            color={field.value === slot ? 'primary' : 'default'}
                            variant={field.value === slot ? 'filled' : 'outlined'}
                            onClick={() => field.onChange(slot)}
                            sx={{
                              borderColor: theme.palette.grey[300],
                              '&.MuiChip-colorPrimary': {
                                backgroundColor: theme.palette.primary.main,
                                color: theme.palette.common.white,
                              },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  />
                )}
                {errors.time && (
                  <Typography variant="caption" sx={{ color: theme.palette.error.main, mt: 0.5, display: 'block' }}>
                    {errors.time.message}
                  </Typography>
                )}
              </Box>
            )}

            {/* Recurring appointment */}
            {isAuthenticated && selectedDoctorId && selectedDate && (
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: theme.palette.text.secondary, mb: 1 }}
                >
                  <Repeat sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }} />
                  {t('recurring')}
                </Typography>
                <Controller
                  name="is_recurring"
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        sx={{ p: 0.5 }}
                      />
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {t('recurring_help')}
                      </Typography>
                    </Box>
                  )}
                />

                {watchedIsRecurring && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Controller
                      name="frequency"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {(['daily', 'weekly', 'monthly'] as RecurrenceFrequency[]).map((freq) => (
                            <Chip
                              key={freq}
                              label={t(`frequency_${freq}`)}
                              clickable
                              color={field.value === freq ? 'primary' : 'default'}
                              variant={field.value === freq ? 'filled' : 'outlined'}
                              onClick={() => field.onChange(freq)}
                              sx={{
                                borderColor: theme.palette.grey[300],
                                '&.MuiChip-colorPrimary': {
                                  backgroundColor: theme.palette.primary.main,
                                  color: theme.palette.common.white,
                                },
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    />
                    <Controller
                      name="occurrences"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mr: 1 }}>
                            {t('occurrences')}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => field.onChange(Math.max(1, (field.value ?? 2) - 1))}
                            sx={{ border: `1px solid ${theme.palette.grey[300]}`, borderRadius: '6px' }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
                            {field.value ?? 2}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => field.onChange(Math.min(52, (field.value ?? 2) + 1))}
                            sx={{ border: `1px solid ${theme.palette.grey[300]}`, borderRadius: '6px' }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, ml: 1 }}>
                            {t('occurrences_help')}
                          </Typography>
                        </Box>
                      )}
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* Guest info (when not authenticated) */}
            {!isAuthenticated && (
              <>
                <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mt: 1 }}>
                  {t('guest_info')}
                </Typography>

                <Controller
                  name="guest_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('full_name')}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <PersonOutline
                              sx={{ color: theme.palette.text.secondary, fontSize: 20, mr: 1 }}
                            />
                          ),
                        },
                      }}
                    />
                  )}
                />

                <Controller
                  name="guest_email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={tc('common:email', 'Email')}
                      fullWidth
                      error={!!errors.guest_email}
                      helperText={errors.guest_email?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <EmailOutlined
                              sx={{ color: theme.palette.text.secondary, fontSize: 20, mr: 1 }}
                            />
                          ),
                        },
                      }}
                    />
                  )}
                />

                <Controller
                  name="guest_phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('phone')}
                      fullWidth
                      slotProps={{
                        input: {
                          startAdornment: (
                            <PhoneOutlined
                              sx={{ color: theme.palette.text.secondary, fontSize: 20, mr: 1 }}
                            />
                          ),
                        },
                      }}
                    />
                  )}
                />
              </>
            )}

            {/* Notes */}
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('additional_notes')}
                  multiline
                  rows={3}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <NotesOutlined
                          sx={{
                            color: theme.palette.text.secondary,
                            fontSize: 20,
                            mr: 1,
                            alignSelf: 'flex-start',
                            mt: 1,
                          }}
                        />
                      ),
                    },
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderColor: theme.palette.grey[300],
              color: theme.palette.text.secondary,
              '&:hover': { borderColor: theme.palette.text.secondary },
            }}
          >
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                },
                px: 4,
              }}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : t('book_appointment')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
