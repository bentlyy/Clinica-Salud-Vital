import { Box, Typography, Paper, Chip, Avatar } from '@mui/material';
import Science from '@mui/icons-material/Science';
import { useNavigate } from 'react-router-dom';
import { MotionDiv } from '@/shared/utils/animations';
import type { LabRequest, LabRequestStatus } from '../types/lab.types';
import { LAB_STATUS_CONFIG, LAB_PRIORITY_CONFIG } from '../types/lab.types';

interface LabPipelineProps {
  requests: LabRequest[];
}

const PIPELINE_COLUMNS: { status: LabRequestStatus; key: LabRequestStatus }[] = [
  { status: 'pending', key: 'pending' },
  { status: 'in_progress', key: 'in_progress' },
  { status: 'completed', key: 'completed' },
  { status: 'validated', key: 'validated' },
  { status: 'delivered', key: 'delivered' },
];

export function LabPipeline({ requests }: LabPipelineProps) {
  const navigate = useNavigate();

  const grouped = PIPELINE_COLUMNS.map((col) => ({
    ...col,
    items: requests.filter((r) => r.status === col.status),
  }));

  return (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
      {grouped.map((col) => {
        const config = LAB_STATUS_CONFIG[col.key];
        return (
          <Box
            key={col.key}
            sx={{
              minWidth: 260,
              flex: 1,
              backgroundColor: '#f9fafb',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
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
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                {config.label}
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
                  sx={{ color: '#9ca3af', textAlign: 'center', py: 3, fontSize: '0.75rem' }}
                >
                  Sin solicitudes
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
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderColor: '#d1d5db',
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
                            color: '#1f2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {request.title}
                        </Typography>
                        {request.patient_name && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {request.patient_name}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <Chip
                        label={LAB_PRIORITY_CONFIG[request.priority].label}
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
                        <Typography variant="caption" sx={{ color: '#9ca3af', ml: 'auto' }}>
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
