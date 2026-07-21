import { useMemo } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import type { AvailabilityRule } from '../types/availability.types';
import { DAY_NAMES, WEEK_DAYS_ORDER } from '../types/availability.types';

interface AvailabilityGridProps {
  rules: AvailabilityRule[];
  onDelete?: (id: number) => void;
}

interface TimeBlock {
  rule: AvailabilityRule;
  startMinutes: number;
  endMinutes: number;
}

function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

export function AvailabilityGrid({ rules, onDelete }: AvailabilityGridProps) {
  const rulesByDay = useMemo(() => {
    const grouped: Record<number, TimeBlock[]> = {};
    for (const rule of rules) {
      if (!grouped[rule.day_of_week]) grouped[rule.day_of_week] = [];
      grouped[rule.day_of_week]!.push({
        rule,
        startMinutes: timeToMinutes(rule.start_time),
        endMinutes: timeToMinutes(rule.end_time),
      });
    }
    return grouped;
  }, [rules]);

  if (rules.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          No hay reglas de disponibilidad configuradas.
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
          Agrega horarios para que los pacientes puedan agendar citas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      {/* Header row with day names */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
        <Box /> {/* empty corner */}
        {WEEK_DAYS_ORDER.map((dayIndex) => (
          <Box
            key={dayIndex}
            sx={{
              textAlign: 'center',
              py: 1,
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8125rem' }}
            >
              {DAY_NAMES[dayIndex]}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Grid body */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 0.5 }}>
        {HOURS.map((hour) => (
          <Box key={hour} sx={{ display: 'contents' }}>
            {/* Time label */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                pr: 1,
              }}
            >
              <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                {String(hour).padStart(2, '0')}:00
              </Typography>
            </Box>

            {/* Day cells */}
            {WEEK_DAYS_ORDER.map((dayIndex) => {
              const blocks = rulesByDay[dayIndex] ?? [];
              const hourMinutes = hour * 60;
              const activeBlock = blocks.find(
                (b) => hourMinutes >= b.startMinutes && hourMinutes < b.endMinutes,
              );

              return (
                <Box
                  key={`${dayIndex}-${hour}`}
                  sx={{
                    minHeight: 36,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: activeBlock ? '#0d9488' : '#f3f4f6',
                    backgroundColor: activeBlock ? '#f0fdfa' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: activeBlock ? '#0f766e' : '#d1d5db',
                    },
                  }}
                >
                  {activeBlock && (
                    <Tooltip
                      title={`${activeBlock.rule.start_time} - ${activeBlock.rule.end_time}`}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#0d9488',
                          }}
                        />
                        {onDelete && hour === Math.floor(activeBlock.startMinutes / 60) && (
                          <Tooltip title="Eliminar regla">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(activeBlock.rule.id);
                              }}
                              sx={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                p: 0.25,
                                color: '#ef4444',
                                '&:hover': { backgroundColor: '#fef2f2' },
                              }}
                            >
                              <DeleteOutline sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mt: 3, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: '#f0fdfa', border: '1px solid #0d9488' }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Horario disponible</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: '#fff', border: '1px solid #f3f4f6' }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Sin disponibilidad</Typography>
        </Box>
      </Box>
    </Box>
  );
}
