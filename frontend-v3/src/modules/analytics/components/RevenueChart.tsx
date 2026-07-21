import { Box, Paper, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import type { RevenueByMonth } from '../types/analytics.types';

interface RevenueChartProps {
  data: RevenueByMonth[];
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      sx={{ p: 3, border: '1px solid #e5e7eb' }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 3 }}>
        Ingresos por Mes
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
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Ingresos"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ fill: '#0d9488', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Gastos"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
