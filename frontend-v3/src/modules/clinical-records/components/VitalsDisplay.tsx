import { Box, Card, CardContent, Typography } from '@mui/material';
import MonitorHeart from '@mui/icons-material/MonitorHeart';
import Thermostat from '@mui/icons-material/Thermostat';
import Favorite from '@mui/icons-material/Favorite';
import Scale from '@mui/icons-material/Scale';
import Height from '@mui/icons-material/Height';
import Opacity from '@mui/icons-material/Opacity';
import { MotionDiv } from '@/shared/utils/animations';

interface VitalsDisplayProps {
  vitals: Record<string, string>;
}

const VITAL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; unit: string }> = {
  temperature: {
    label: 'Temperatura',
    icon: <Thermostat />,
    color: '#ef4444',
    bgColor: '#fef2f2',
    unit: '°C',
  },
  blood_pressure: {
    label: 'Presión Arterial',
    icon: <MonitorHeart />,
    color: '#2563eb',
    bgColor: '#eff6ff',
    unit: 'mmHg',
  },
  heart_rate: {
    label: 'Frecuencia Cardíaca',
    icon: <Favorite />,
    color: '#ec4899',
    bgColor: '#fdf2f8',
    unit: 'lpm',
  },
  weight: {
    label: 'Peso',
    icon: <Scale />,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    unit: 'kg',
  },
  height: {
    label: 'Estatura',
    icon: <Height />,
    color: '#059669',
    bgColor: '#ecfdf5',
    unit: 'cm',
  },
  oxygen_saturation: {
    label: 'Saturación Oò',
    icon: <Opacity />,
    color: '#0d9488',
    bgColor: '#f0fdfa',
    unit: '%',
  },
};

const vitalsOrder = ['temperature', 'blood_pressure', 'heart_rate', 'weight', 'height', 'oxygen_saturation'];

export function VitalsDisplay({ vitals }: VitalsDisplayProps) {
  const entries = vitalsOrder
    .filter((key) => vitals[key] !== undefined && vitals[key] !== '')
    .map((key) => ({ key, config: VITAL_CONFIG[key]!, value: vitals[key] }));

  if (entries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          No hay signos vitales registrados
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
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
              border: '1px solid #e5e7eb',
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
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                    {config.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
                    {value}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: '#9ca3af', ml: 0.5 }}
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
