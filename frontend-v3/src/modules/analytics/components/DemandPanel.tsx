import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DemandRecord } from '../types/analytics.types';

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color || theme.palette.text.primary }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
}

export function DemandPanel({ data }: { data: DemandRecord[] }) {
  const theme = useTheme();
  const totalBookings = data.reduce((a, d) => a + d.bookings, 0);
  const avgDaily = data.length > 0 ? Math.round(totalBookings / data.length) : 0;
  const peakDay = data.length > 0 ? Math.max(...data.map(d => d.bookings)) : 0;

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard label="Citas (30 días)" value={totalBookings} />
        <StatCard label="Promedio Diario" value={avgDaily} />
        <StatCard label="Día Pico" value={peakDay} color={theme.palette.warning.main} />
      </Box>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Demanda Diaria</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="bookings" stroke={theme.palette.info.main} fill={theme.palette.info.main} fillOpacity={0.3} name="Citas" />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Pronóstico de Demanda</Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
          Predicción basada en promedios históricos y desviación estándar.
        </Typography>
        <Box>
          {data.slice(0, 7).map((d, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${theme.palette.custom.surface.sunken}` }}>
              <Typography variant="body2">{d.date}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.predicted || d.bookings} citas</Typography>
              <Typography variant="body2" sx={{ color: d.predicted && d.predicted > d.bookings ? theme.palette.error.main : theme.palette.success.main }}>
                {d.predicted ? (d.predicted > d.bookings ? '↑ Demanda alta' : '↓ Normal') : 'Actual'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
