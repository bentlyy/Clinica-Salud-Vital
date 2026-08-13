import { useState } from 'react';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Close from '@mui/icons-material/Close';
import EventBusy from '@mui/icons-material/EventBusy';
import { format } from 'date-fns';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '../hooks/useHolidays';
import type { CreateHolidayInput } from '../types/holiday.types';

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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
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
      ) : (
        <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('date', { defaultValue: 'Fecha' })}</TableCell>
                <TableCell>{t('name', { defaultValue: 'Nombre' })}</TableCell>
                <TableCell>{t('notice', { defaultValue: 'Aviso (días)' })}</TableCell>
                <TableCell>{t('cancelsBookings', { defaultValue: 'Cancela citas' })}</TableCell>
                <TableCell align="right">{t('actions', { defaultValue: 'Acciones' })}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays && holidays.length > 0 ? (
                holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{format(new Date(h.holiday_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{h.notice_days}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.cancel_bookings ? t('yes', { defaultValue: 'Sí' }) : t('no', { defaultValue: 'No' })}
                        color={h.cancel_bookings ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteHoliday.mutate(h.id)}
                        disabled={deleteHoliday.isPending}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <EventBusy sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {t('empty', { defaultValue: 'No hay feriados registrados' })}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { borderRadius: '16px', border: `1px solid ${theme.palette.divider}` } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('add', { defaultValue: 'Agregar feriado' })}
          <IconButton size="small" onClick={() => setOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, width: 420 }}>
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
