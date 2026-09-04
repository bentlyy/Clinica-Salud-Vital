import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Typography } from '@mui/material';
import { AttachmentsList } from '@/modules/attachments/components/AttachmentsList';

interface AttachmentsTabProps {
  patientId: number;
}

export function AttachmentsTab({ patientId }: AttachmentsTabProps) {
  const theme = useTheme();
  const { t } = useTranslation('patient_ficha');

  return (
    <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {t('noAttachmentsDesc')}
        </Typography>
      </Box>
      <AttachmentsList entityType="patient" entityId={patientId} canManage />
    </Paper>
  );
}
