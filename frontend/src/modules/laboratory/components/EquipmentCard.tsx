import { Box, Typography, Paper, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import PrecisionManufacturing from '@mui/icons-material/PrecisionManufacturing';
import Build from '@mui/icons-material/Build';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import { MotionDiv } from '@/shared/utils/animations';
import { formatDate } from '@/shared/utils/localeUtils';
import type { LabEquipment } from '../types/lab.types';
import { LAB_EQUIPMENT_STATUS_CONFIG } from '../types/lab.types';

interface EquipmentCardProps {
  equipment: LabEquipment;
}

export function EquipmentCard({ equipment }: EquipmentCardProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const statusConfig = LAB_EQUIPMENT_STATUS_CONFIG[equipment.status];

  const STATUS_ICONS: Record<LabEquipment['status'], React.ReactNode> = {
    online: <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.dark }} />,
    offline: <Cancel sx={{ fontSize: 16, color: theme.palette.error.main }} />,
    maintenance: <Build sx={{ fontSize: 16, color: theme.palette.warning.dark }} />,
    calibration: <Build sx={{ fontSize: 16, color: theme.palette.info.dark }} />,
  };

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
          border: `1px solid ${theme.palette.divider}`,
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
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {equipment.name}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {equipment.connection_type}
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
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.25 }}>
            {t('model')}: {equipment.model}
          </Typography>
        )}
        {equipment.serial_number && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.25 }}>
            {t('serial')}: {equipment.serial_number}
          </Typography>
        )}
        {equipment.last_calibration && (
          <Typography variant="caption" sx={{ color: theme.palette.warning.dark, display: 'block', mt: 0.5 }}>
            {t('lastCalibration')}: {formatDate(equipment.last_calibration)}
          </Typography>
        )}
      </Paper>
    </MotionDiv>
  );
}
