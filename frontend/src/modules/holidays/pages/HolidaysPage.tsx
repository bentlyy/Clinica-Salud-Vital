import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Close from '@mui/icons-material/Close';
import EventBusy from '@mui/icons-material/EventBusy';
import { format } from 'date-fns';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '../hooks/useHolidays';
import type { CreateHolidayInput, Holiday } from '../types/holiday.types';

export default function HolidaysPage() {
  const { t } = useTranslation('holidays');
  const theme = useTheme();
  const { data: holidays, isLoading } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateHolidayInput>({
    holiday_date: '',
    name: '',
    notice_days: 15,
    cancel_bookings: true,
  });

  const handleCreate = () => {
    createHoliday.mutate(form, {
      onSuccess: () => {
        setOpen(false);
        setForm({ holiday_date: '', name: '', notice_days: 15, cancel_bookings: true });
      },
    });
  };

  const today = new Date().toISOString().split('T')[0];

  const columns = useMemo<DataTableColumn<Holiday>[]>(
    () => [
      {
        key: 'holiday_date',
        header: t('date', { defaultValue: 'Fecha' }),
        render: (holiday) => format(new Date(`${holiday.holiday_date}T00:00:00`), 'dd/MM/yyyy'),
      },
      { key: 'name', header: t('name', { defaultValue: 'Nombre' }) },
      { key: 'notice_days', header: t('notice', { defaultValue: 'Aviso (días)' }) },
      {
        key: 'cancel_bookings',
        header: t('cancelsBookings', { defaultValue: 'Cancela citas' }),
        render: (holiday) => (
          <Chip
            size="small"
            label={holiday.cancel_bookings ? t('yes', { defaultValue: 'Sí' }) : t('no', { defaultValue: 'No' })}
            color={holiday.cancel_bookings ? 'warning' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        key: 'actions',
        header: t('actions', { defaultValue: 'Acciones' }),
        align: 'right',
        render: (holiday) => (
          <IconButton
            size="small"
            color="error"
            onClick={() => deleteHoliday.mutate(holiday.id)}
            disabled={deleteHoliday.isPending}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [t, deleteHoliday],
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {t('title', { defaultValue: 'Días feriados de la clínica' })}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          {t('add', { defaultValue: 'Agregar feriado' })}
        </Button>
      </Box>

      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
        {t('description', {
          defaultValue:
            'Los feriados cierran la clínica. Si se cancelan citas, se notifica a los pacientes y a la lista de espera.',
        })}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : holidays && holidays.length > 0 ? (
        <DataTable
          columns={columns}
          data={holidays}
          keyExtractor={(holiday) => holiday.id}
        />
      ) : (
        <Paper
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '12px',
            py: 4,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <EventBusy sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1 }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {t('empty', { defaultValue: 'No hay feriados registrados' })}
          </Typography>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px', border: `1px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('add', { defaultValue: 'Agregar feriado' })}
          <IconButton size="small" onClick={() => setOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="date"
              label={t('date', { defaultValue: 'Fecha' })}
              value={form.holiday_date}
              onChange={(e) => setForm({ ...form, holiday_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
              fullWidth
            />
            <TextField
              label={t('name', { defaultValue: 'Nombre' })}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              type="number"
              label={t('notice', { defaultValue: 'Aviso (días)' })}
              value={form.notice_days}
              onChange={(e) => setForm({ ...form, notice_days: Number(e.target.value) })}
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="checkbox"
                checked={form.cancel_bookings}
                onChange={(e) => setForm({ ...form, cancel_bookings: e.target.checked })}
              />
              <Typography variant="body2">{t('cancelsBookings', { defaultValue: 'Cancelar citas de ese día' })}</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: theme.palette.text.secondary }}>
            {t('cancel', { defaultValue: 'Cancelar' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.holiday_date || !form.name || createHoliday.isPending}
            sx={{ px: 3 }}
          >
            {createHoliday.isPending ? <CircularProgress size={20} color="inherit" /> : t('save', { defaultValue: 'Guardar' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
