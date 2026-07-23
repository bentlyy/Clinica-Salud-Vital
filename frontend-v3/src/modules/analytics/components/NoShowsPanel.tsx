import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { NoShowRecord } from '../types/analytics.types';

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Paper sx={{ p: 2.5, border: '1px solid #e5e7eb', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
}

export function NoShowsPanel({ data }: { data: NoShowRecord[] }) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const noShows = data.reduce((acc, d) => acc + d.noShows, 0);
  const rate = total > 0 ? ((noShows / total) * 100).toFixed(1) : '0';

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard label="Citas Totales" value={total} color="#374151" />
        <StatCard label="No-Shows" value={noShows} color="#ef4444" />
        <StatCard label="Tasa de No-Show" value={`${rate}%`} color={Number(rate) > 15 ? '#ef4444' : '#10b981'} />
      </Box>

      <Paper sx={{ p: 3, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>No-Shows por Doctor</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="doctor" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#3b82f6" name="Total Citas" />
            <Bar dataKey="noShows" fill="#ef4444" name="No-Shows" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Predicción de No-Shows</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
          Doctores con tasa de no-show superior al 15% requieren recordatorios adicionales.
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Doctor</TableCell>
                <TableCell align="right">Riesgo</TableCell>
                <TableCell align="right">Recomendación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(0, 5).map((d, i) => {
                const pct = d.total > 0 ? (d.noShows / d.total) * 100 : 0;
                const highRisk = pct > 15;
                return (
                  <TableRow key={i}>
                    <TableCell>{d.doctor}</TableCell>
                    <TableCell align="right" sx={{ color: highRisk ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      {pct.toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {highRisk ? 'Recordatorio extra' : 'Normal'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
