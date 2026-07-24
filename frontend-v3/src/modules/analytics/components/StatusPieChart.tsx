import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import type { BookingsByStatus } from '../types/analytics.types';

interface StatusPieChartProps {
  data: BookingsByStatus[];
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  cancelled: 'Canceladas',
  pending: 'Pendientes',
  no_show: 'No Asistió',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const theme = useTheme();
  if (!active || !payload?.length || !payload[0]) return null;
  const item = payload[0];
  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '10px',
        p: 1.5,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
        {item.name}: {item.value}
      </Typography>
    </Box>
  );
}

export function StatusPieChart({ data, isLoading }: StatusPieChartProps) {
  const theme = useTheme();

  const STATUS_COLORS: Record<string, string> = {
    confirmed: theme.palette.primary.main,
    completed: theme.palette.info.main,
    cancelled: theme.palette.error.main,
    pending: theme.palette.warning.main,
    no_show: theme.palette.text.secondary,
  };

  const DEFAULT_COLORS = [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.text.secondary,
    theme.palette.secondary.main,
  ];
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
      sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 3 }}>
        Citas por Estado
      </Typography>

      {isLoading ? (
        <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Cargando datos...</Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>No hay datos disponibles</Typography>
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
                <span style={{ color: theme.palette.text.primary, fontSize: '0.8125rem' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
