import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Tenant, CreateTenantInput, UpdateTenantInput } from '../types/super-admin.types';

const createTenantSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  domain: z.string().optional(),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']),
});

const editTenantSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  domain: z.string().optional(),
});

type CreateFormData = z.infer<typeof createTenantSchema>;
type EditFormData = z.infer<typeof editTenantSchema>;

interface TenantFormDialogProps {
  open: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSubmit: (input: CreateTenantInput | UpdateTenantInput) => void;
  isPending: boolean;
}

export function TenantFormDialog({ open, tenant, onClose, onSubmit, isPending }: TenantFormDialogProps) {
  const isEditing = !!tenant;
  const { t } = useTranslation('super_admin_tenants');

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(isEditing ? editTenantSchema : createTenantSchema),
    defaultValues: isEditing
      ? { name: tenant.name, domain: tenant.domain || '' }
      : { name: '', domain: '', plan: 'free' },
  });

  useEffect(() => {
    if (open) {
      if (tenant) {
        reset({ name: tenant.name, domain: tenant.domain || '' });
      } else {
        reset({ name: '', domain: '', plan: 'free' });
      }
    }
  }, [open, tenant, reset, isEditing]);

  const handleFormSubmit = (data: CreateFormData | EditFormData) => {
    onSubmit(data as CreateTenantInput | UpdateTenantInput);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '14px' } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEditing ? t('edit_clinic_dialog', 'Editar Clínica') : t('new_clinic_dialog', 'Nueva Clínica')}
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label={t('name_label', 'Nombre')}
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            label={t('domain_optional', 'Dominio (opcional)')}
            {...register('domain')}
            placeholder={t('domain_placeholder', 'ejemplo.com')}
            sx={{ mb: 2.5 }}
          />

          {!isEditing && (
            <Controller
              name="plan"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>{t('plan_label', 'Plan')}</InputLabel>
                  <Select {...field} label={t('plan_label', 'Plan')}>
                    <MenuItem value="free">Gratuito</MenuItem>
                    <MenuItem value="basic">Básico</MenuItem>
                    <MenuItem value="pro">Pro</MenuItem>
                    <MenuItem value="enterprise">Enterprise</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {t('cancel', 'Cancelar')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isPending}
        >
          {isPending ? t('saving', 'Guardando...') : isEditing ? t('update_btn', 'Actualizar') : t('create_btn', 'Crear')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
