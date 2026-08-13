import { useState } from 'react';
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

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#ecfdf5', color: '#059669' },
  pending: { bg: '#fffbeb', color: '#d97706' },
  in_progress: { bg: '#eff6ff', color: '#2563eb' },
  draft: { bg: '#f3f4f6', color: '#6b7280' },
};

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

  const renderRecordDetail = (r: FichaClinicalRecord) => (
    <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', borderRadius: '12px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('patient_history:detailTitle', { date: r.created_at?.split('T')[0] })}
        </Typography>
        <Chip
          label={r.status}
          size="small"
          sx={{
            backgroundColor: STATUS_COLORS[r.status || '']?.bg || theme.palette.grey[100],
            color: STATUS_COLORS[r.status || '']?.color || theme.palette.text.secondary,
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
    <Paper sx={{ p: 2.5, mb: 3, border: '1px solid #e5e7eb', borderRadius: '12px' }}>
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
                    backgroundColor: entry.status === 'resolved' ? '#ecfdf5' : '#fffbeb',
                    color: entry.status === 'resolved' ? '#059669' : '#d97706',
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
          <Paper sx={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            {records.length === 0 ? (
              <EmptyState
                icon={<Description sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
                title={t('patient_history:noRecords')}
                message={t('patient_history:noRecordsDesc')}
              />
            ) : (
              <List disablePadding>
                {records.map((r, idx) => {
                  const st = STATUS_COLORS[r.status || ''] || { bg: theme.palette.grey[100], color: theme.palette.text.secondary };
                  return (
                    <Box key={r.id}>
                      {idx > 0 && <Divider />}
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0fdfa' } }}
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
