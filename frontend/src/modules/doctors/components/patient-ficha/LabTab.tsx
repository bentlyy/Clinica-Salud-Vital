import { useTranslation } from 'react-i18next';
import { useTheme, type Theme } from '@mui/material/styles';
import { Box, Paper, Typography, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';
import Science from '@mui/icons-material/Science';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { downloadLabOrderPdf } from '@/shared/utils/pdf';
import type { FichaLabRequest } from './types';

interface LabTabProps {
  labRequests: FichaLabRequest[];
}

function getStatusColor(status: string, theme: Theme): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: theme.palette.custom.status.success.bg, color: theme.palette.success.main },
    delivered: { bg: theme.palette.custom.status.success.bg, color: theme.palette.success.main },
    signed: { bg: theme.palette.custom.status.success.bg, color: theme.palette.success.main },
    pending: { bg: theme.palette.custom.status.warning.bg, color: theme.palette.warning.dark },
    in_progress: { bg: theme.palette.custom.status.info.bg, color: theme.palette.info.main },
    draft: { bg: theme.palette.custom.surface.sunken, color: theme.palette.text.secondary },
  };
  return map[status] || { bg: theme.palette.grey[100], color: theme.palette.text.secondary };
}

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
    <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <List disablePadding>
        {labRequests.map((r, idx) => {
          const st = getStatusColor(r.status, theme);
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
