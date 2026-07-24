import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import type { InvoiceItem, CreateInvoiceInput } from '../types/billing.types';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  unit_price: z.number().min(0, 'El precio unitario debe ser positivo'),
  total: z.number(),
});

const invoiceFormSchema = z.object({
  patient_id: z.number().min(1, 'Selecciona un paciente'),
  due_date: z.string().min(1, 'La fecha de vencimiento es requerida'),
  tax: z.number().min(0, 'El impuesto debe ser positivo').max(100, 'El impuesto no puede superar el 100%'),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Debe agregar al menos un servicio'),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceInput) => void;
  isLoading?: boolean;
}

export function InvoiceFormDialog({ open, onClose, onSubmit, isLoading }: InvoiceFormDialogProps) {
  const theme = useTheme();
  const [patients] = useState<{ id: number; name: string }[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      patient_id: 0,
      due_date: '',
      tax: 19,
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedTax = watch('tax');

  const subtotal = watchedItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const taxAmount = subtotal * ((Number(watchedTax) || 0) / 100);
  const grandTotal = subtotal + taxAmount;

  useEffect(() => {
    if (!open) {
      reset({
        patient_id: 0,
        due_date: '',
        tax: 19,
        notes: '',
        items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      });
    }
  }, [open, reset]);

  const handleFormSubmit = (data: InvoiceFormData) => {
    const items: InvoiceItem[] = data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    onSubmit({
      patient_id: data.patient_id,
      items,
      tax: data.tax,
      due_date: data.due_date,
      notes: data.notes,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', border: `1px solid ${theme.palette.divider}` },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: theme.palette.text.primary, pb: 1 }}>
        Crear Nueva Factura
      </DialogTitle>

      <DialogContent sx={{ pt: '16px !important' }}>
        <Box component="form" id="invoice-form" onSubmit={handleSubmit(handleFormSubmit)}>
          <Controller
            name="patient_id"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Paciente"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={!!errors.patient_id}
                helperText={errors.patient_id?.message}
                sx={{ mb: 2 }}
              >
                <MenuItem value={0} disabled>
                  Seleccionar paciente...
                </MenuItem>
                {patients.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="date"
                label="Fecha de vencimiento"
                error={!!errors.due_date}
                helperText={errors.due_date?.message}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="tax"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Impuesto (%)"
                value={field.value ?? 0}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={!!errors.tax}
                helperText={errors.tax?.message}
                sx={{ mb: 3 }}
              />
            )}
          />

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Servicios
            </Typography>
            <Button
              startIcon={<Add />}
              onClick={() => append({ description: '', quantity: 1, unit_price: 0, total: 0 })}
              size="small"
            >
              Agregar
            </Button>
          </Box>

          <AnimatePresence>
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 1, mb: 2, alignItems: 'flex-start' }}>
                  <Controller
                    name={`items.${index}.description`}
                    control={control}
                    render={({ field: itemField }) => (
                      <TextField
                        {...itemField}
                        fullWidth
                        label="Descripción"
                        size="small"
                        error={!!errors.items?.[index]?.description}
                        helperText={errors.items?.[index]?.description?.message}
                      />
                    )}
                  />

                  <Controller
                    name={`items.${index}.quantity`}
                    control={control}
                    render={({ field: itemField }) => (
                      <TextField
                        {...itemField}
                        fullWidth
                        type="number"
                        label="Cantidad"
                        size="small"
                        value={itemField.value ?? 1}
                        onChange={(e) => itemField.onChange(Number(e.target.value))}
                        error={!!errors.items?.[index]?.quantity}
                      />
                    )}
                  />

                  <Controller
                    name={`items.${index}.unit_price`}
                    control={control}
                    render={({ field: itemField }) => (
                      <TextField
                        {...itemField}
                        fullWidth
                        type="number"
                        label="Precio Unit."
                        size="small"
                        value={itemField.value ?? 0}
                        onChange={(e) => itemField.onChange(Number(e.target.value))}
                        error={!!errors.items?.[index]?.unit_price}
                      />
                    )}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Total"
                    value={(() => {
                      const qty = Number(watchedItems[index]?.quantity) || 0;
                      const price = Number(watchedItems[index]?.unit_price) || 0;
                      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(qty * price);
                    })()}
                    slotProps={{ input: { readOnly: true } }}
                  />

                  <IconButton
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    sx={{ color: theme.palette.error.main, mt: 0.5 }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>

          {errors.items?.message && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {errors.items.message}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, mb: 2 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Subtotal: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(subtotal)}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Impuesto ({watchedTax}%): {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(taxAmount)}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              Total: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(grandTotal)}
            </Typography>
          </Box>

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={2}
                label="Notas (opcional)"
                value={field.value ?? ''}
                sx={{ mt: 1 }}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        <Button type="submit" form="invoice-form" variant="contained" disabled={isLoading}>
          {isLoading ? 'Creando...' : 'Crear Factura'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
