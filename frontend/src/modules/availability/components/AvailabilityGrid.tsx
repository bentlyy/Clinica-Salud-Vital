import { useMemo } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
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
  const theme = useTheme();
  const { t } = useTranslation('availability');
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
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          {t('no_rules_configured')}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 1 }}>
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
              backgroundColor: theme.palette.custom.surface.muted,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.8125rem' }}
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
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
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
                    borderColor: activeBlock ? theme.palette.primary.main : theme.palette.custom.surface.sunken,
                    backgroundColor: activeBlock ? theme.palette.custom.brand.lightest : theme.palette.background.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: activeBlock ? theme.palette.primary.dark : theme.palette.divider,
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
                            backgroundColor: theme.palette.primary.main,
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
                                color: theme.palette.error.main,
                                '&:hover': { backgroundColor: theme.palette.custom.status.error.bg },
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
          <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: theme.palette.custom.brand.lightest, border: `1px solid ${theme.palette.primary.main}` }} />
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{t('available_slot')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.custom.surface.sunken}` }} />
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{t('no_availability')}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
