import { Box, Typography, Paper, Chip, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import Science from '@mui/icons-material/Science';
import { useNavigate } from 'react-router-dom';
import { MotionDiv } from '@/shared/utils/animations';
import type { LabRequest, LabRequestStatus } from '../types/lab.types';
import { LAB_STATUS_LABELS, LAB_STATUS_CONFIG, LAB_PRIORITY_CONFIG } from '../types/lab.types';

interface LabPipelineProps {
  requests: LabRequest[];
}

const PIPELINE_COLUMNS: LabRequestStatus[] = [
  'pending',
  'received',
  'processing',
  'delivered',
  'cancelled',
];

export function LabPipeline({ requests }: LabPipelineProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation('lab');

  const grouped = PIPELINE_COLUMNS.map((status) => ({
    status,
    label: t(`lab:statusLabels.${status}`, LAB_STATUS_LABELS[status]),
    items: requests.filter((r) => r.status === status),
  }));

  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
      {grouped.map((col) => {
        const config = LAB_STATUS_CONFIG[col.status];
        return (
          <Box
            key={col.status}
            sx={{
              minWidth: 260,
              flex: 1,
              backgroundColor: theme.palette.custom.surface.muted,
              borderRadius: '14px',
              border: `1px solid ${theme.palette.divider}`,
              p: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: config.color,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {col.label}
              </Typography>
              <Chip
                label={col.items.length}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: config.bgColor,
                  color: config.color,
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {col.items.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 3, fontSize: '0.75rem' }}
                >
                  {t('lab:noItems', 'Sin solicitudes')}
                </Typography>
              )}
              {col.items.map((request, index) => (
                <MotionDiv
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Paper
                    elevation={0}
                    onClick={() => navigate(`/laboratory/${request.id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderColor: theme.palette.divider,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          backgroundColor: config.bgColor,
                          color: config.color,
                        }}
                      >
                        <Science sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {request.request_number || `#${request.id}`}
                        </Typography>
                        {request.patient_name && (
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                            {request.patient_name}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <Chip
                        label={t(`lab:priorityLabels.${request.priority}`, LAB_PRIORITY_CONFIG[request.priority].label)}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          backgroundColor: LAB_PRIORITY_CONFIG[request.priority].bgColor,
                          color: LAB_PRIORITY_CONFIG[request.priority].color,
                        }}
                      />
                      {request.doctor_name && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, ml: 'auto' }}>
                          Dr. {request.doctor_name.split(' ').slice(-1)[0]}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </MotionDiv>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
