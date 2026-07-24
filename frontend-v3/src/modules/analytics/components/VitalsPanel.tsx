import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import WarningAmber from '@mui/icons-material/WarningAmber';

import type { VitalsRecord } from '../types/analytics.types';

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
}

export function VitalsPanel({ data }: { data: VitalsRecord[] }) {
  const theme = useTheme();
  const anomalies = data.filter(d => d.anomaly);
  const normal = data.length - anomalies.length;

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard label="Registros Totales" value={data.length} color={theme.palette.text.primary} />
        <StatCard label="Anomalías Detectadas" value={anomalies.length} color={theme.palette.error.main} />
        <StatCard label="Normales" value={normal} color={theme.palette.success.main} />
      </Box>

      {anomalies.length > 0 && (
        <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WarningAmber sx={{ color: theme.palette.error.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Anomalías Vitales</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            Registros con signos vitales fuera de rango normal requieren atención.
          </Typography>
          {anomalies.map((d, i) => (
            <Paper key={i} sx={{ p: 2, mb: 1, borderLeft: `4px solid ${theme.palette.error.main}` }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Paciente: {d.patientId}</Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {d.date} | Presión: {d.pressure} {d.pressureAnomaly && '⚠️'} |
                FC: {d.heartRate} lpm {d.heartRateAnomaly && '⚠️'} |
                Temp: {d.temperature}°C {d.tempAnomaly && '⚠️'}
              </Typography>
            </Paper>
          ))}
        </Paper>
      )}

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Distribución de Signos Vitales</Typography>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={[
                { name: 'Normales', value: normal },
                { name: 'Anómalos', value: anomalies.length },
              ]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              label
            >
              <Cell fill={theme.palette.success.main} />
              <Cell fill={theme.palette.error.main} />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
