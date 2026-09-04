import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import type { DemandRecord } from '../types/analytics.types';

const StatCard = memo(function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color || theme.palette.text.primary }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>{label}</Typography>
    </Paper>
  );
});

export function DemandPanel({ data }: { data: DemandRecord[] }) {
  const theme = useTheme();
  const { t } = useTranslation('analytics');
  const totalBookings = data.reduce((a, d) => a + d.bookings, 0);
  const avgDaily = data.length > 0 ? Math.round(totalBookings / data.length) : 0;
  const peakDay = data.length > 0 ? Math.max(...data.map(d => d.bookings)) : 0;

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard label={t('bookings_30_days')} value={totalBookings} />
        <StatCard label={t('daily_average')} value={avgDaily} />
        <StatCard label={t('peak_day')} value={peakDay} color={theme.palette.warning.main} />
      </Box>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{t('daily_demand')}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="bookings" stroke={theme.palette.info.main} fill={theme.palette.info.main} fillOpacity={0.3} name={t('bookings')} />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t('demand_forecast')}</Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
          {t('forecast_description')}
        </Typography>
        <Box>
          {data.slice(0, 7).map((d) => (
            <Box key={d.date} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${theme.palette.custom.surface.sunken}` }}>
              <Typography variant="body2">{d.date}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.predicted || d.bookings} {t('bookings')}</Typography>
              <Typography variant="body2" sx={{ color: d.predicted && d.predicted > d.bookings ? theme.palette.error.main : theme.palette.success.main }}>
                {d.predicted ? (d.predicted > d.bookings ? t('high_demand') : t('normal')) : t('current')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
