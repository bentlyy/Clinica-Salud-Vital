import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography, Chip, Divider, List, ListItem, ListItemText, Stack } from '@mui/material';
import Medication from '@mui/icons-material/Medication';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { FichaPrescriptionRecord } from './types';

interface PrescriptionsTabProps {
  prescriptions: FichaPrescriptionRecord[];
}

export function PrescriptionsTab({ prescriptions }: PrescriptionsTabProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (prescriptions.length === 0) {
    return (
      <EmptyState
        icon={<Medication sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
        title={t('patient_ficha:noPrescriptions')}
        message={t('patient_ficha:noPrescriptionsDesc')}
      />
    );
  }

  return (
    <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <List disablePadding>
        {prescriptions.map((record, idx) => (
          <Box key={record.clinical_record_id}>
            {idx > 0 && <Divider />}
            <ListItem alignItems="flex-start" sx={{ px: 2, py: 1.5 }}>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                    {record.created_at?.split('T')[0]} &middot; {t('patient_ficha:recordDoctor', { name: record.doctor_name || '' })}
                  </Typography>
                }
                secondary={
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {record.medications.length === 0 && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        —
                      </Typography>
                    )}
                    {record.medications.map((med) => (
                      <Box key={med.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<Medication sx={{ fontSize: 16 }} />}
                          label={med.name}
                          size="small"
                          sx={{ backgroundColor: theme.palette.custom.status.success.bg, color: theme.palette.primary.dark, fontWeight: 600 }}
                        />
                        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                          {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                }
              />
            </ListItem>
          </Box>
        ))}
      </List>
    </Paper>
  );
}
