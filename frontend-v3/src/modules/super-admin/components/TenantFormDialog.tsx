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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Tenant, CreateTenantInput } from '../types/super-admin.types';

const tenantSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug debe tener al menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  domain: z.string().optional(),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormDialogProps {
  open: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSubmit: (input: CreateTenantInput) => void;
  isPending: boolean;
}

export function TenantFormDialog({ open, tenant, onClose, onSubmit, isPending }: TenantFormDialogProps) {
  const isEditing = !!tenant;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      slug: '',
      domain: '',
      plan: 'free',
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (open) {
      if (tenant) {
        reset({
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain || '',
          plan: tenant.plan,
        });
      } else {
        reset({ name: '', slug: '', domain: '', plan: 'free' });
      }
    }
  }, [open, tenant, reset]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing && nameValue) {
      const slug = nameValue
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setValue('slug', slug);
    }
  }, [nameValue, isEditing, setValue]);

  const handleFormSubmit = (data: TenantFormData) => {
    onSubmit(data);
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
        {isEditing ? 'Editar Clínica' : 'Nueva Clínica'}
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Nombre"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            label="Slug (identificador URL)"
            {...register('slug')}
            error={!!errors.slug}
            helperText={errors.slug?.message || 'Se genera automáticamente desde el nombre'}
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            label="Dominio (opcional)"
            {...register('domain')}
            placeholder="ejemplo.com"
            sx={{ mb: 2.5 }}
          />

          <Controller
            name="plan"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Plan</InputLabel>
                <Select {...field} label="Plan">
                  <MenuItem value="free">Gratuito</MenuItem>
                  <MenuItem value="basic">Básico</MenuItem>
                  <MenuItem value="pro">Pro</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isPending}
        >
          {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
