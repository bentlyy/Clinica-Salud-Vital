import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
} from '@mui/material';
import Description from '@mui/icons-material/Description';
import MedicalInformation from '@mui/icons-material/MedicalInformation';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { FichaClinicalRecord, FichaMedicalHistoryEntry } from './types';

interface HistoryTabProps {
  records: FichaClinicalRecord[];
  medicalHistory: FichaMedicalHistoryEntry[];
}

const HISTORY_STATUS_KEYS: Record<string, string> = {
  active: 'historyActive',
  resolved: 'historyResolved',
  chronic: 'historyChronic',
  family: 'historyFamily',
};

export function HistoryTab({ records, medicalHistory }: HistoryTabProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedRecord, setSelectedRecord] = useState<FichaClinicalRecord | null>(null);

  const statusColors: Record<string, { bg: string; color: string }> = useMemo(
    () => ({
      completed: { bg: theme.palette.custom.status.success.bg, color: theme.palette.custom.status.success.text },
      pending: { bg: theme.palette.custom.status.warning.bg, color: theme.palette.custom.status.warning.text },
      in_progress: { bg: theme.palette.custom.status.info.bg, color: theme.palette.info.main },
      draft: { bg: theme.palette.custom.surface.muted, color: theme.palette.text.secondary },
    }),
    [theme],
  );

  const renderRecordDetail = (r: FichaClinicalRecord) => (
    <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('patient_history:detailTitle', { date: r.created_at?.split('T')[0] })}
        </Typography>
        <Chip
          label={r.status}
          size="small"
          sx={{
            backgroundColor: statusColors[r.status || '']?.bg || theme.palette.grey[100],
            color: statusColors[r.status || '']?.color || theme.palette.text.secondary,
          }}
        />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
            {t('patient_history:chiefComplaint')}
          </Typography>
          <Typography variant="body2">{r.chief_complaint || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
            {t('patient_history:anamnesis')}
          </Typography>
          <Typography variant="body2">{r.anamnesis || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
            {t('patient_history:diagnosis')}
          </Typography>
          <Typography variant="body2">{r.diagnosis || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
            {t('patient_history:treatmentPlan')}
          </Typography>
          <Typography variant="body2">{r.treatment_plan || '—'}</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {t('patient_ficha:recordDoctor', { name: r.doctor_name || '' })}
        </Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Chip label={t('patient_history:backToList')} onClick={() => setSelectedRecord(null)} clickable size="small" sx={{ cursor: 'pointer' }} />
      </Box>
    </Paper>
  );

  const renderMedicalHistory = () => (
    <Paper sx={{ p: 2.5, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <MedicalInformation sx={{ color: theme.palette.info.main, fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('patient_ficha:medicalHistory')}
        </Typography>
      </Box>
      {medicalHistory.length === 0 ? (
        <EmptyState
          icon={<MedicalInformation sx={{ fontSize: 40, color: theme.palette.grey[300] }} />}
          title={t('patient_ficha:noMedicalHistory')}
          message={t('patient_ficha:noMedicalHistoryDesc')}
        />
      ) : (
        <Stack spacing={1.5}>
          {medicalHistory.map((entry) => (
            <Box key={entry.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {entry.condition}
                </Typography>
                <Chip
                  label={t(`patient_ficha:${HISTORY_STATUS_KEYS[entry.status] ?? 'historyActive'}`)}
                  size="small"
                  sx={{
                    backgroundColor: entry.status === 'resolved' ? theme.palette.custom.status.success.bg : theme.palette.custom.status.warning.bg,
                    color: entry.status === 'resolved' ? theme.palette.custom.status.success.text : theme.palette.custom.status.warning.text,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                {entry.onset_date && (
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {entry.onset_date}
                  </Typography>
                )}
              </Box>
              {entry.notes && (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
                  {entry.notes}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );

  return (
    <Box>
      {selectedRecord ? (
        renderRecordDetail(selectedRecord)
      ) : (
        <>
          {renderMedicalHistory()}
          <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
            {records.length === 0 ? (
              <EmptyState
                icon={<Description sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
                title={t('patient_history:noRecords')}
                message={t('patient_history:noRecordsDesc')}
              />
            ) : (
              <List disablePadding>
                {records.map((r, idx) => {
                  const st = statusColors[r.status || ''] || { bg: theme.palette.grey[100], color: theme.palette.text.secondary };
                  return (
                    <Box key={r.id}>
                      {idx > 0 && <Divider />}
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.custom.brand.lightest } }}
                        onClick={() => setSelectedRecord(r)}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {r.diagnosis || t('patient_history:noDiagnosis')}
                              </Typography>
                              <Chip label={r.status} size="small" sx={{ backgroundColor: st.bg, color: st.color, fontSize: 11 }} />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                              {r.created_at?.split('T')[0]} &middot; {t('patient_ficha:recordDoctor', { name: r.doctor_name || '' })}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </Box>
                  );
                })}
              </List>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
