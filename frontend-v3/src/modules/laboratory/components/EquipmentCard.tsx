import { Box, Typography, Paper, Chip } from '@mui/material';
import PrecisionManufacturing from '@mui/icons-material/PrecisionManufacturing';
import Build from '@mui/icons-material/Build';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import { MotionDiv } from '@/shared/utils/animations';
import type { LabEquipment } from '../types/lab.types';
import { LAB_EQUIPMENT_STATUS_CONFIG } from '../types/lab.types';

interface EquipmentCardProps {
  equipment: LabEquipment;
}

const STATUS_ICONS: Record<LabEquipment['status'], React.ReactNode> = {
  operational: <CheckCircle sx={{ fontSize: 16, color: '#059669' }} />,
  maintenance: <Build sx={{ fontSize: 16, color: '#d97706' }} />,
  out_of_service: <Cancel sx={{ fontSize: 16, color: '#ef4444' }} />,
};

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const statusConfig = LAB_EQUIPMENT_STATUS_CONFIG[equipment.status];

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              backgroundColor: statusConfig.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PrecisionManufacturing sx={{ color: statusConfig.color, fontSize: 22 }} />
          </Box>
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
              {equipment.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {equipment.type}
            </Typography>
          </Box>
          <Chip
            icon={<>{STATUS_ICONS[equipment.status]}</>}
            label={statusConfig.label}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 500,
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
              '& .MuiChip-icon': { ml: 0.5 },
            }}
          />
        </Box>

        {equipment.model && (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.25 }}>
            Modelo: {equipment.model}
          </Typography>
        )}
        {equipment.serial_number && (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.25 }}>
            Serial: {equipment.serial_number}
          </Typography>
        )}
        {equipment.next_calibration && (
          <Typography variant="caption" sx={{ color: '#d97706', display: 'block', mt: 0.5 }}>
            Próxima calibración: {new Date(equipment.next_calibration).toLocaleDateString('es-CL')}
          </Typography>
        )}
      </Paper>
    </MotionDiv>
  );
}
