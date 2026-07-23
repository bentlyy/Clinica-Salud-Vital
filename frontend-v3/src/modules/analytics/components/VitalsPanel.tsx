import { Box, Paper, Typography } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import WarningAmber from '@mui/icons-material/WarningAmber';
import CheckCircle from '@mui/icons-material/CheckCircle';
import type { VitalsRecord } from '../types/analytics.types';

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Paper sx={{ p: 2.5, border: '1px solid #e5e7eb', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
}

export function VitalsPanel({ data }: { data: VitalsRecord[] }) {
  const anomalies = data.filter(d => d.anomaly);
  const normal = data.length - anomalies.length;

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard label="Registros Totales" value={data.length} color="#374151" />
        <StatCard label="Anomalías Detectadas" value={anomalies.length} color="#ef4444" />
        <StatCard label="Normales" value={normal} color="#10b981" />
      </Box>

      {anomalies.length > 0 && (
        <Paper sx={{ p: 3, border: '1px solid #e5e7eb', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WarningAmber sx={{ color: '#ef4444' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Anomalías Vitales</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Registros con signos vitales fuera de rango normal requieren atención.
          </Typography>
          {anomalies.map((d, i) => (
            <Paper key={i} sx={{ p: 2, mb: 1, borderLeft: '4px solid #ef4444' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Paciente: {d.patientId}</Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {d.date} | Presión: {d.pressure} {d.pressureAnomaly && '⚠️'} |
                FC: {d.heartRate} lpm {d.heartRateAnomaly && '⚠️'} |
                Temp: {d.temperature}°C {d.tempAnomaly && '⚠️'}
              </Typography>
            </Paper>
          ))}
        </Paper>
      )}

      <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
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
              <Cell fill="#10b981" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
