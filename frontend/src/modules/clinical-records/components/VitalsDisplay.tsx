import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import MonitorHeart from '@mui/icons-material/MonitorHeart';
import Thermostat from '@mui/icons-material/Thermostat';
import Favorite from '@mui/icons-material/Favorite';
import Scale from '@mui/icons-material/Scale';
import Height from '@mui/icons-material/Height';
import Opacity from '@mui/icons-material/Opacity';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';

interface VitalsDisplayProps {
  vitals: Record<string, string>;
}

function getVitalConfig(theme: Theme): Record<string, { labelKey: string; labelFallback: string; icon: React.ReactNode; color: string; bgColor: string; unit: string }> {
  return {
    temperature: {
      labelKey: 'clinical_records:temperature',
      labelFallback: 'Temperatura',
      icon: <Thermostat />,
      color: theme.palette.error.main,
      bgColor: theme.palette.custom.status.error.bg,
      unit: '°C',
    },
    blood_pressure: {
      labelKey: 'clinical_records:blood_pressure',
      labelFallback: 'Presión Arterial',
      icon: <MonitorHeart />,
      color: theme.palette.info.main,
      bgColor: theme.palette.custom.status.info.bg,
      unit: 'mmHg',
    },
    heart_rate: {
      labelKey: 'clinical_records:heart_rate',
      labelFallback: 'Frecuencia Cardíaca',
      icon: <Favorite />,
      color: theme.palette.custom.pink.main,
      bgColor: theme.palette.custom.pink.bg,
      unit: 'lpm',
    },
    weight: {
      labelKey: 'clinical_records:weight',
      labelFallback: 'Peso',
      icon: <Scale />,
      color: theme.palette.custom.purple.main,
      bgColor: theme.palette.custom.purple.bg,
      unit: 'kg',
    },
    height: {
      labelKey: 'clinical_records:height',
      labelFallback: 'Altura',
      icon: <Height />,
      color: theme.palette.success.main,
      bgColor: theme.palette.custom.status.success.bg,
      unit: 'cm',
    },
    oxygen_saturation: {
      labelKey: 'clinical_records:oxygen_saturation',
      labelFallback: 'Saturación de Oxígeno',
      icon: <Opacity />,
      color: theme.palette.primary.main,
      bgColor: theme.palette.custom.brand.lightest,
      unit: '%',
    },
  };
}

const vitalsOrder = ['temperature', 'blood_pressure', 'heart_rate', 'weight', 'height', 'oxygen_saturation'];

export function VitalsDisplay({ vitals }: VitalsDisplayProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const vitalConfig = getVitalConfig(theme);
  const entries = vitalsOrder
    .filter((key) => vitals[key] !== undefined && vitals[key] !== '')
    .map((key) => ({ key, config: vitalConfig[key]!, value: vitals[key] }));

  if (entries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {t('clinical_records:noVitals', 'No hay signos vitales registrados')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      {entries.map(({ key, config, value }, index) => (
        <MotionDiv
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: config.bgColor,
                    color: config.color,
                    '& svg': { fontSize: 18 },
                  }}
                >
                  {config.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                    {t(config.labelKey, config.labelFallback)}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                    {value}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary, ml: 0.5 }}
                    >
                      {config.unit}
                    </Typography>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </MotionDiv>
      ))}
    </Box>
  );
}
