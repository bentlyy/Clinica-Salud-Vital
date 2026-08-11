import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { NoShowRecord } from '../types/analytics.types';

const StatCard = memo(function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
});

export function NoShowsPanel({ data }: { data: NoShowRecord[] }) {
  const theme = useTheme();
  const { t } = useTranslation('analytics');
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const noShows = data.reduce((acc, d) => acc + d.noShows, 0);
  const rate = total > 0 ? ((noShows / total) * 100).toFixed(1) : '0';

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard label={t('total_bookings')} value={total} color={theme.palette.text.primary} />
        <StatCard label={t('no_shows')} value={noShows} color={theme.palette.error.main} />
        <StatCard label={t('no_show_rate')} value={`${rate}%`} color={Number(rate) > 15 ? theme.palette.error.main : theme.palette.success.main} />
      </Box>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('no_shows_by_doctor')}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="doctor" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill={theme.palette.info.main} name={t('total_bookings_chart')} />
            <Bar dataKey="noShows" fill={theme.palette.error.main} name={t('no_shows')} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t('prediction_no_shows')}</Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
          {t('prediction_description')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('doctor')}</TableCell>
                <TableCell align="right">{t('risk')}</TableCell>
                <TableCell align="right">{t('recommendation')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(0, 5).map((d) => {
                const pct = d.total > 0 ? (d.noShows / d.total) * 100 : 0;
                const highRisk = pct > 15;
                return (
                  <TableRow key={d.doctor}>
                    <TableCell>{d.doctor}</TableCell>
                    <TableCell align="right" sx={{ color: highRisk ? theme.palette.error.main : theme.palette.success.main, fontWeight: 600 }}>
                      {pct.toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {highRisk ? t('extra_reminder') : t('normal')}
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
