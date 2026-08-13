import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography, Avatar, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Description from '@mui/icons-material/Description';
import Medication from '@mui/icons-material/Medication';
import Science from '@mui/icons-material/Science';
import AttachFile from '@mui/icons-material/AttachFile';
import type { FichaPatient, FichaMedicalHistoryEntry } from './types';

export type SummaryTabId = 'bookings' | 'history' | 'prescriptions' | 'attachments' | 'lab';

interface SummaryTabProps {
  patient: FichaPatient;
  counts: {
    bookings: number;
    records: number;
    prescriptions: number;
    lab: number;
    attachments: number;
  };
  medicalHistory: FichaMedicalHistoryEntry[];
  onNavigate: (tab: SummaryTabId) => void;
}

const HISTORY_STATUS_KEYS: Record<string, string> = {
  active: 'historyActive',
  resolved: 'historyResolved',
  chronic: 'historyChronic',
  family: 'historyFamily',
};

export function SummaryTab({ patient, counts, medicalHistory, onNavigate }: SummaryTabProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const statCards: { id: SummaryTabId; label: string; value: number; icon: React.ReactNode; color: string }[] = [
    { id: 'bookings', label: t('patient_ficha:summaryBookings'), value: counts.bookings, icon: <CalendarMonth />, color: '#0d9488' },
    { id: 'history', label: t('patient_ficha:summaryRecords'), value: counts.records, icon: <Description />, color: '#7c3aed' },
    { id: 'prescriptions', label: t('patient_ficha:summaryPrescriptions'), value: counts.prescriptions, icon: <Medication />, color: '#d97706' },
    { id: 'lab', label: t('patient_ficha:summaryLab'), value: counts.lab, icon: <Science />, color: '#2563eb' },
    { id: 'attachments', label: t('patient_ficha:summaryAttachments'), value: counts.attachments, icon: <AttachFile />, color: '#db2777' },
  ];

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{ width: 64, height: 64, backgroundColor: theme.palette.primary.main, fontSize: '1.5rem' }}
          >
            {patient.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {patient.name}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {[patient.rut, patient.email, patient.phone].filter(Boolean).join(' · ') || '—'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {statCards.map((stat) => (
          <Grid xs={12} sm={6} md={4} key={stat.id}>
            <Paper
              onClick={() => onNavigate(stat.id)}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                transition: 'all 0.2s',
                '&:hover': { borderColor: stat.color, boxShadow: `0 4px 12px ${stat.color}22`, transform: 'translateY(-2px)' },
              }}
            >
              <Avatar sx={{ width: 44, height: 44, backgroundColor: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {medicalHistory.length > 0 && (
        <Paper sx={{ p: 2.5, mt: 3, border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1.5 }}>
            {t('patient_ficha:medicalHistory')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {medicalHistory.slice(0, 6).map((entry) => (
              <Chip
                key={entry.id}
                label={entry.condition}
                size="small"
                sx={{
                  backgroundColor: entry.status === 'resolved' ? '#ecfdf5' : '#fffbeb',
                  color: entry.status === 'resolved' ? '#059669' : '#d97706',
                  fontWeight: 600,
                }}
                title={t(`patient_ficha:${HISTORY_STATUS_KEYS[entry.status] ?? 'historyActive'}`)}
              />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
