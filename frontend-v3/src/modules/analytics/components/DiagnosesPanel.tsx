import { Box, Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DiagnosisRecord } from '../types/analytics.types';

export function DiagnosesPanel({ data }: { data: DiagnosisRecord[] }) {
  return (
    <Box>
      <Paper sx={{ p: 3, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Top Diagnósticos</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="diagnosis" type="category" width={150} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" name="Casos" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Diagnósticos Principales</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {data.slice(0, 6).map((d, i) => (
            <Paper key={i} sx={{ p: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.diagnosis}</Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>{d.count} casos</Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#10b981', mt: 0.5 }}>
                CIE-10: {d.cie10 || 'N/A'}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
