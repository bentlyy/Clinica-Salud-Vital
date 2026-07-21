import { Box, Paper, Typography } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import type { BookingsByStatus } from '../types/analytics.types';

interface StatusPieChartProps {
  data: BookingsByStatus[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#0d9488',
  completed: '#3b82f6',
  cancelled: '#ef4444',
  pending: '#f59e0b',
  no_show: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  cancelled: 'Canceladas',
  pending: 'Pendientes',
  no_show: 'No Asistió',
};

const DEFAULT_COLORS = ['#0d9488', '#3b82f6', '#ef4444', '#f59e0b', '#6b7280', '#8b5cf6'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length || !payload[0]) return null;
  const item = payload[0];
  return (
    <Box
      sx={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        p: 1.5,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
        {item.name}: {item.value}
      </Typography>
    </Box>
  );
}

export function StatusPieChart({ data, isLoading }: StatusPieChartProps) {
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    status: item.status,
  }));

  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      sx={{ p: 3, border: '1px solid #e5e7eb' }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 3 }}>
        Citas por Estado
      </Typography>

      {isLoading ? (
        <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>Cargando datos...</Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>No hay datos disponibles</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: '#374151', fontSize: '0.8125rem' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
