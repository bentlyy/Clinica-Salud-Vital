import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import type { BookingsByMonth } from '../types/analytics.types';

interface BookingsByMonthChartProps {
  data: BookingsByMonth[];
  isLoading: boolean;
}

export function BookingsByMonthChart({ data, isLoading }: BookingsByMonthChartProps) {
  const theme = useTheme();
  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 3 }}>
        Citas por Mes
      </Typography>

      {isLoading ? (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Cargando datos...</Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>No hay datos disponibles</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar dataKey="confirmed" name="Confirmadas" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
            <Bar dataKey="cancelled" name="Canceladas" fill={theme.palette.error.main} radius={[4, 4, 0, 0]} />
            <Bar dataKey="total" name="Total" fill={theme.palette.info.main} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
