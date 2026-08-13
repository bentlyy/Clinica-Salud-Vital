import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';
import Science from '@mui/icons-material/Science';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { downloadLabOrderPdf } from '@/shared/utils/pdf';
import type { FichaLabRequest } from './types';

interface LabTabProps {
  labRequests: FichaLabRequest[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#ecfdf5', color: '#059669' },
  delivered: { bg: '#ecfdf5', color: '#059669' },
  signed: { bg: '#ecfdf5', color: '#059669' },
  pending: { bg: '#fffbeb', color: '#d97706' },
  in_progress: { bg: '#eff6ff', color: '#2563eb' },
  draft: { bg: '#f3f4f6', color: '#6b7280' },
};

export function LabTab({ labRequests }: LabTabProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (labRequests.length === 0) {
    return (
      <EmptyState
        icon={<Science sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
        title={t('patient_history:noExams')}
        message={t('patient_history:noExamsDesc')}
      />
    );
  }

  return (
    <Paper sx={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
      <List disablePadding>
        {labRequests.map((r, idx) => {
          const st = STATUS_COLORS[r.status] || { bg: theme.palette.grey[100], color: theme.palette.text.secondary };
          const canDownload = r.status === 'completed' || r.status === 'delivered' || r.status === 'signed';
          return (
            <Box key={r.id}>
              {idx > 0 && <Divider />}
              <ListItem
                secondaryAction={
                  canDownload ? (
                    <Chip
                      label={t('patient_history:downloadPdf')}
                      size="small"
                      onClick={() => downloadLabOrderPdf(r.id)}
                      sx={{ cursor: 'pointer', backgroundColor: theme.palette.info.light, color: theme.palette.info.main }}
                    />
                  ) : undefined
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {r.test_type || r.request_number}
                      </Typography>
                      <Chip label={r.status} size="small" sx={{ backgroundColor: st.bg, color: st.color, fontSize: 11 }} />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {r.created_at?.split('T')[0]} &middot; {t('patient_history:priority')}: {r.priority}
                    </Typography>
                  }
                />
              </ListItem>
            </Box>
          );
        })}
      </List>
    </Paper>
  );
}
