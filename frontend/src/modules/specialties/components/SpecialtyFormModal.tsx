import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Add from '@mui/icons-material/Add';
import type { Tenant } from '@/modules/super-admin/types/super-admin.types';
import type { Specialty, CreateSpecialtyInput } from '../types/specialty.types';

const COLOR_PRESETS = [
  '#1976D2',
  '#0d9488',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#4f46e5',
  '#e11d48',
];

interface SpecialtyFormModalProps {
  open: boolean;
  editing: Specialty | null;
  clinics: Tenant[];
  isSuperAdmin: boolean;
  defaultTenantId: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSpecialtyInput & { tenantId?: string }) => void;
}

export function SpecialtyFormModal({
  open,
  editing,
  clinics,
  isSuperAdmin,
  defaultTenantId,
  isPending,
  onClose,
  onSubmit,
}: SpecialtyFormModalProps) {
  const { t } = useTranslation('specialties');
  const { t: tc } = useTranslation('common');
  const theme = useTheme();
  const [procedureInput, setProcedureInput] = useState('');
  const [procedures, setProcedures] = useState<string[]>([]);

  const schema = z.object({
    name: z.string().min(2, t('nameRequired')),
    description: z.string().optional(),
    icon: z.string().max(4).optional(),
    department: z.string().optional(),
    color: z.string().optional(),
    tenantId: isSuperAdmin ? z.string().min(1, t('clinicRequired')) : z.string().optional(),
  });

  type FormData = z.infer<typeof schema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      icon: '🩺',
      department: '',
      color: COLOR_PRESETS[1],
      tenantId: defaultTenantId,
    },
  });

  const color = watch('color');

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          description: editing.description || '',
          icon: editing.icon || '🩺',
          department: editing.department || '',
          color: editing.color || COLOR_PRESETS[1],
          tenantId: editing.tenant_id ? String(editing.tenant_id) : defaultTenantId,
        });
        setProcedures(editing.procedures ?? []);
      } else {
        reset({
          name: '',
          description: '',
          icon: '🩺',
          department: '',
          color: COLOR_PRESETS[1],
          tenantId: defaultTenantId,
        });
        setProcedures([]);
      }
    }
  }, [open, editing, defaultTenantId, reset]);

  const handleAddProcedure = () => {
    const value = procedureInput.trim();
    if (value && !procedures.includes(value)) {
      setProcedures((prev) => [...prev, value]);
    }
    setProcedureInput('');
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      description: data.description || undefined,
      icon: data.icon || '🩺',
      department: data.department || undefined,
      color: data.color || COLOR_PRESETS[1],
      procedures,
      tenantId: isSuperAdmin ? data.tenantId : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '14px' } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editing ? t('editSpecialty') : t('newSpecialty')}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label={tc('name')}
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            sx={{ mb: 2.5 }}
          />
          <TextField
            fullWidth
            label={t('descriptionOptional')}
            {...register('description')}
            multiline
            rows={2}
            sx={{ mb: 2.5 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
            <TextField
              fullWidth
              label={t('icon')}
              {...register('icon')}
              helperText={t('iconHelper')}
              sx={{ maxWidth: 200 }}
            />
            <TextField
              fullWidth
              label={t('departmentLabel')}
              {...register('department')}
              placeholder={t('departmentHelper')}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
              {t('colorLabel')}
            </Typography>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map((c) => (
                    <Box
                      key={c}
                      role="button"
                      aria-label={`${t('colorLabel')} ${c}`}
                      onClick={() => field.onChange(c)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: color === c ? `3px solid ${theme.palette.background.paper}` : '3px solid transparent',
                        boxShadow: color === c ? `0 0 0 2px ${c}` : `0 0 0 1px ${theme.palette.divider}`,
                        transition: 'transform 0.15s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    />
                  ))}
                </Box>
              )}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
              {t('proceduresLabel')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                fullWidth
                placeholder={t('proceduresHelper')}
                value={procedureInput}
                onChange={(e) => setProcedureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProcedure();
                  }
                }}
              />
              <Button
                variant="outlined"
                size="medium"
                onClick={handleAddProcedure}
                startIcon={<Add />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {tc('add')}
              </Button>
            </Box>
            {procedures.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                {procedures.map((p, i) => (
                  <Chip
                    key={`${p}-${i}`}
                    label={p}
                    size="small"
                    onDelete={() => setProcedures((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </Box>
            )}
          </Box>

          {isSuperAdmin && (
            <FormControl fullWidth error={!!errors.tenantId}>
              <InputLabel>{t('clinicLabel')}</InputLabel>
              <Controller
                name="tenantId"
                control={control}
                render={({ field }) => (
                  <Select {...field} label={t('clinicLabel')}>
                    {clinics.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.tenantId && (
                <Typography variant="caption" color="error">
                  {errors.tenantId.message}
                </Typography>
              )}
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {tc('cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isPending}
        >
          {isPending ? t('saving') : editing ? t('updating') : tc('create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
