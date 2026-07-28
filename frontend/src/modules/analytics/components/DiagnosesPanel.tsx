import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DiagnosisRecord } from '../types/analytics.types';

export function DiagnosesPanel({ data }: { data: DiagnosisRecord[] }) {
  const theme = useTheme();
  const { t } = useTranslation('analytics');
  return (
    <Box>
      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('top_diagnoses')}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="diagnosis" type="category" width={150} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill={theme.palette.success.main} name={t('top_diagnoses_chart')} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('main_diagnoses')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {data.slice(0, 6).map((d, i) => (
            <Paper key={i} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.diagnosis}</Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{d.count} {t('cases')}</Typography>
              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.success.main, mt: 0.5 }}>
                CIE-10: {d.cie10 || 'N/A'}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
