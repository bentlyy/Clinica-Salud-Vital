import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { ScheduleRecord } from '../types/analytics.types';

const HOURS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function getScoreColor(score: number): string {
  if (score > 70) return '#10b981';
  if (score > 40) return '#f59e0b';
  return '#ef4444';
}

export function SchedulesPanel({ data }: { data: ScheduleRecord[] }) {
  return (
    <Box>
      <Paper sx={{ p: 3, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Mejores Horarios</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
          Mapa de ocupación por día y hora. Verde = mayor demanda.
        </Typography>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {DAYS.map((day) => {
            const dayData = data.find(d => d.day === day);
            return (
              <Box key={day} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ width: 80, fontWeight: 500 }}>{day}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                  {HOURS.map((hour) => {
                    const hourData = dayData?.hours?.find(h => h.time === hour);
                    const score = hourData?.score ?? 50;
                    return (
                      <Box
                        key={hour}
                        sx={{
                          flex: 1,
                          p: 1,
                          bgcolor: getScoreColor(score),
                          borderRadius: 1,
                          textAlign: 'center',
                          color: '#fff',
                          fontSize: '0.7rem',
                        }}
                      >
                        {hour}<br />{score}%
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Recomendaciones de Horario</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Día</TableCell>
                <TableCell>Mejor Hora</TableCell>
                <TableCell>Ocupación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.slice(0, 5).map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{d.day}</TableCell>
                  <TableCell>{d.bestTime}</TableCell>
                  <TableCell>
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: d.occupancy > 70 ? '#fef2f2' : '#f0fdfa',
                        color: d.occupancy > 70 ? '#dc2626' : '#0d9488',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                      }}
                    >
                      {d.occupancy}%
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
