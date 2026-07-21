import { Box, Paper, Typography } from '@mui/material';
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
  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      sx={{ p: 3, border: '1px solid #e5e7eb' }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 3 }}>
        Citas por Mes
      </Typography>

      {isLoading ? (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>Cargando datos...</Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>No hay datos disponibles</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar dataKey="confirmed" name="Confirmadas" fill="#0d9488" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cancelled" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
