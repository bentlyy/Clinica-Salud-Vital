import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { apiClient } from '@/shared/services/api-client';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { formatRut, validateRut } from '@/shared/utils/rut';
import toast from 'react-hot-toast';

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

interface Doctor {
  id: number;
  name: string;
  specialty?: string;
}

interface Slot {
  time: string;
  available: boolean;
}

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

const STEPS = ['guest_booking.step_personal', 'guest_booking.step_doctor', 'guest_booking.step_confirm'] as const;

export default function GuestBookingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* Step 1: Personal */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rut, setRut] = useState('');
  const [rutError, setRutError] = useState('');

  /* Step 2: Doctor + Slot */
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  /* ------- Step navigation ------- */
  const canNext = useMemo(() => {
    if (activeStep === 0) {
      return name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0;
    }
    if (activeStep === 1) {
      return selectedDoctor !== null && date.length > 0 && selectedSlot !== null;
    }
    return true;
  }, [activeStep, name, email, phone, selectedDoctor, date, selectedSlot]);

  const handleNext = useCallback(() => {
    if (activeStep === 0 && rut.trim().length > 0 && !validateRut(rut)) {
      setRutError(t('validation:invalidFormat'));
      return;
    }
    setRutError('');
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [activeStep, rut, t]);

  const handleBack = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  /* ------- Load doctors on entering step 1 ------- */
  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const res = await apiClient.get<Doctor[] | { data: Doctor[] }>('/doctors/public');
      const list = Array.isArray(res.data) ? res.data : (res.data as { data: Doctor[] }).data;
      setDoctors(list ?? []);
    } catch {
      setError(t('errors:fetchError'));
    } finally {
      setDoctorsLoading(false);
    }
  }, [t]);

  /* Load doctors when entering step 1 */
  useMemo(() => {
    if (activeStep === 1 && doctors.length === 0) {
      void loadDoctors();
    }
  }, [activeStep, doctors.length, loadDoctors]);

  /* ------- Load slots ------- */
  const loadSlots = useCallback(
    async (doctorId: number, dateStr: string) => {
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const res = await apiClient.get<Slot[] | { data: Slot[] }>('/bookings/slots', {
          params: { doctor_id: doctorId, date: dateStr },
        });
        const list = Array.isArray(res.data) ? res.data : (res.data as { data: Slot[] }).data;
        setSlots(list ?? []);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [],
  );

  const handleDoctorChange = useCallback(
    (_: React.SyntheticEvent, value: Doctor | null) => {
      setSelectedDoctor(value);
      setSelectedSlot(null);
      if (value && date) {
        void loadSlots(value.id, date);
      }
    },
    [date, loadSlots],
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setDate(val);
      setSelectedSlot(null);
      if (selectedDoctor && val) {
        void loadSlots(selectedDoctor.id, val);
      }
    },
    [selectedDoctor, loadSlots],
  );

  const handleRutChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRut(formatRut(raw));
  }, []);

  /* ------- Submit ------- */
  const handleSubmit = useCallback(async () => {
    if (!selectedDoctor || !selectedSlot || !date) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/bookings/guest', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        rut: rut.trim() || undefined,
        doctor_id: selectedDoctor.id,
        date,
        time: selectedSlot,
      });
      setSuccess(true);
      toast.success(t('guest_booking:success'));
    } catch {
      setError(t('guest_booking:error'));
    } finally {
      setLoading(false);
    }
  }, [selectedDoctor, selectedSlot, date, name, email, phone, rut, t]);

  /* ------- Render step content ------- */
  const renderStepContent = () => {
    if (success) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {t('guest_booking:success')}
          </Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/')}>
            {t('common:goHome')}
          </Button>
        </Box>
      );
    }

    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              required
              label={t('guest_booking:name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <TextField
              fullWidth
              required
              type="email"
              label={t('guest_booking:email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              fullWidth
              required
              label={t('guest_booking:phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
            />
            <TextField
              fullWidth
              label={t('guest_booking:rut')}
              value={rut}
              onChange={handleRutChange}
              error={!!rutError}
              helperText={rutError}
              placeholder="12.345.678-9"
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Autocomplete
              options={doctors}
              loading={doctorsLoading}
              getOptionLabel={(opt) =>
                opt.specialty ? `${opt.name} — ${opt.specialty}` : opt.name
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onChange={handleDoctorChange}
              value={selectedDoctor}
              renderInput={(params) => (
                <TextField {...params} label={t('guest_booking:select_doctor')} />
              )}
            />
            <TextField
              fullWidth
              type="date"
              label={t('guest_booking:select_date')}
              value={date}
              onChange={handleDateChange}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {slotsLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  {t('common:loading')}
                </Typography>
              </Box>
            )}
            {!slotsLoading && slots.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('guest_booking:select_time')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {slots.map((slot) => (
                    <Chip
                      key={slot.time}
                      label={slot.time}
                      clickable
                      disabled={!slot.available}
                      color={selectedSlot === slot.time ? 'primary' : 'default'}
                      variant={selectedSlot === slot.time ? 'filled' : 'outlined'}
                      onClick={() => setSelectedSlot(slot.time)}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {!slotsLoading && selectedDoctor && date && slots.length === 0 && (
              <Alert severity="info">{t('guest_booking:no_slots')}</Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                {t('guest_booking:step_personal')}
              </Typography>
              <Typography variant="body2"><strong>{t('common:name')}:</strong> {name}</Typography>
              <Typography variant="body2"><strong>{t('common:email')}:</strong> {email}</Typography>
              <Typography variant="body2"><strong>{t('common:phone')}:</strong> {phone}</Typography>
              {rut && <Typography variant="body2"><strong>RUT:</strong> {rut}</Typography>}
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                {t('guest_booking:step_doctor')}
              </Typography>
              <Typography variant="body2">
                <strong>{t('common:doctor', { defaultValue: 'Doctor' })}:</strong>{' '}
                {selectedDoctor?.name}
                {selectedDoctor?.specialty ? ` — ${selectedDoctor.specialty}` : ''}
              </Typography>
              <Typography variant="body2"><strong>{t('common:date')}:</strong> {date}</Typography>
              <Typography variant="body2"><strong>{t('common:time')}:</strong> {selectedSlot}</Typography>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2 }}>
        <PageHeader
          title={t('guest_booking:title')}
          action={
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
              {t('common:back')}
            </Button>
          }
        />

        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{t(label)}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && !success && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutlineIcon fontSize="small" />
                {error}
              </Box>
            </Alert>
          )}

          {renderStepContent()}

          {!success && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                {t('common:back')}
              </Button>
              {activeStep < STEPS.length - 1 ? (
                <Button variant="contained" disabled={!canNext} onClick={handleNext}>
                  {t('common:next')}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  onClick={handleSubmit}
                  startIcon={loading ? <CircularProgress size={18} /> : undefined}
                >
                  {loading ? t('common:loading') : t('guest_booking:confirm_booking')}
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
