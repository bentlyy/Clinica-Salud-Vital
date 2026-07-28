import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Collapse,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabRequestItem } from '../../types/lab.types';
import {
  SAMPLE_TYPE_OPTIONS,
  CONTAINER_TYPE_OPTIONS,
  LAB_STATUS_LABELS,
  LAB_STATUS_COLORS,
} from '../../types/lab.types';

// ── Schema ──────────────────────────────────────────────────────────────────

const receptionSchema = z.object({
  sample_type: z.string().min(1, 'Tipo de muestra requerido'),
  container_type: z.string().min(1, 'Tipo de contenedor requerido'),
  volume: z.number().min(0.1, 'Volumen debe ser mayor a 0').optional(),
  notes: z.string().optional(),
});

type ReceptionFormValues = z.infer<typeof receptionSchema>;

// ── Props ───────────────────────────────────────────────────────────────────

interface SampleReceptionProps {
  requestId?: number;
  items?: LabRequestItem[];
  onReceiveSample: (data: {
    lab_request_item_id: number;
    sample_type: string;
    container_type: string;
    volume?: number;
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export const SampleReception = memo(function SampleReception({
  requestId,
  items = [],
  onReceiveSample,
  isLoading = false,
}: SampleReceptionProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleToggleRow = useCallback((itemId: number) => {
    setExpandedRow((prev) => (prev === itemId ? null : itemId));
  }, []);

  const isReceived = (item: LabRequestItem) =>
    item.status === 'received' || item.status === 'verified' || item.status === 'assigned' ||
    item.status === 'processing' || item.status === 'qc_review' || item.status === 'result_entered' ||
    item.status === 'validated_tech' || item.status === 'validated_doctor' || item.status === 'signed' ||
    item.status === 'delivered';

  const pendingItems = items.filter((item) => !isReceived(item));
  const receivedItems = items.filter((item) => isReceived(item));

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {t('reception')}
        </Typography>
        {requestId && (
          <Chip
            label={t('requestNumber', { id: requestId })}
            size="small"
            sx={{
              backgroundColor: theme.palette.custom.brand.lightest,
              color: theme.palette.primary.main,
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {items.length === 0 ? (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 4 }}>
          {t('noItemsInRequest')}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('test')}</TableCell>
                <TableCell>{t('sampleType')}</TableCell>
                <TableCell>{t('volume')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell align="right">{t('actionsLabel')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...pendingItems, ...receivedItems].map((item) => (
                <SampleReceptionRow
                  key={item.id}
                  item={item}
                  expanded={expandedRow === item.id}
                  onToggle={handleToggleRow}
                  onSubmit={onReceiveSample}
                  isLoading={isLoading}
                  alreadyReceived={isReceived(item)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
});

// ── Row Sub-Component ───────────────────────────────────────────────────────

interface SampleReceptionRowProps {
  item: LabRequestItem;
  expanded: boolean;
  onToggle: (id: number) => void;
  onSubmit: SampleReceptionProps['onReceiveSample'];
  isLoading: boolean;
  alreadyReceived: boolean;
}

const SampleReceptionRow = memo(function SampleReceptionRow({
  item,
  expanded,
  onToggle,
  onSubmit,
  isLoading,
  alreadyReceived,
}: SampleReceptionRowProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceptionFormValues>({
    resolver: zodResolver(receptionSchema),
    defaultValues: {
      sample_type: item.test?.sample_type ?? '',
      container_type: item.test?.container_type ?? '',
      volume: item.test?.volume_ml ?? undefined,
      notes: '',
    },
  });

  const handleFormSubmit = (data: ReceptionFormValues) => {
    onSubmit({
      lab_request_item_id: item.id,
      sample_type: data.sample_type,
      container_type: data.container_type,
      volume: data.volume,
      notes: data.notes,
    });
    reset();
  };

  const handleCancel = () => {
    reset();
    onToggle(item.id);
  };

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: alreadyReceived ? theme.palette.custom.brand.lightest : 'transparent',
          '&:hover': { backgroundColor: alreadyReceived ? theme.palette.custom.brand.lighter : theme.palette.custom.surface.muted },
        }}
      >
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {item.test_name ?? `Test #${item.lab_test_id}`}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {item.test?.sample_type
              ? SAMPLE_TYPE_OPTIONS.find((o) => o.value === item.test?.sample_type)?.label ?? item.test.sample_type
              : '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {item.test?.volume_ml ? `${item.test.volume_ml} ml` : '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={LAB_STATUS_LABELS[item.status] ?? item.status}
            size="small"
            sx={{
              backgroundColor: `${LAB_STATUS_COLORS[item.status] ?? theme.palette.text.secondary}15`,
              color: LAB_STATUS_COLORS[item.status] ?? theme.palette.text.secondary,
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </TableCell>
        <TableCell align="right">
          {alreadyReceived ? (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
              label={t('received')}
              size="small"
              sx={{
                backgroundColor: theme.palette.custom.status.success.bg,
                color: theme.palette.success.main,
                fontWeight: 500,
                fontSize: '0.7rem',
              }}
            />
          ) : (
            <IconButton
              size="small"
              onClick={() => onToggle(item.id)}
              sx={{
                color: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.custom.brand.lightest },
              }}
            >
              {expanded ? <ExpandLessIcon /> : <AddCircleOutlineIcon />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box
              component="form"
              onSubmit={handleSubmit(handleFormSubmit)}
              sx={{
                p: 2.5,
                mx: 1,
                mb: 1.5,
                backgroundColor: theme.palette.custom.surface.muted,
                borderRadius: '10px',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
                {t('registerSample')} — {item.test_name ?? `Test #${item.lab_test_id}`}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Controller
                  name="sample_type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={t('sampleType')}
                      size="small"
                      error={!!errors.sample_type}
                      helperText={errors.sample_type?.message}
                    >
                      {SAMPLE_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <Controller
                  name="container_type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={t('containerType')}
                      size="small"
                      error={!!errors.container_type}
                      helperText={errors.container_type?.message}
                    >
                      {CONTAINER_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <Controller
                  name="volume"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('volumeMl')}
                      type="number"
                      size="small"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      error={!!errors.volume}
                      helperText={errors.volume?.message}
                    />
                  )}
                />

                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('notes')}
                      size="small"
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCancel}
                  disabled={isLoading}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {t('register')}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
});
