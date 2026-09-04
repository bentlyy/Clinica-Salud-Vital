import { Box, Chip, Tooltip } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { Specialty, SpecialtyDoctor } from '../types/specialty.types';

export function withAlpha(hex: string, alpha: number): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(13, 148, 136, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSpecialtyColor(specialty: Specialty): string {
  return specialty.color || '#0d9488';
}

export function ColorIndicator({ color, size = 8 }: { color: string; size?: number }) {
  const theme = useTheme();
  return (
    <Box
      component="span"
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color || theme.palette.primary.main,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

export function SpecialtyIcon({ specialty, size = 40 }: { specialty: Specialty; size?: number }) {
  const theme = useTheme();
  const color = getSpecialtyColor(specialty);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '12px',
        backgroundColor: withAlpha(color, theme.palette.mode === 'dark' ? 0.25 : 0.12),
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        flexShrink: 0,
        border: `1px solid ${withAlpha(color, theme.palette.mode === 'dark' ? 0.35 : 0.25)}`,
      }}
    >
      {specialty.icon || '🩺'}
    </Box>
  );
}

export function DepartmentChip({ department, color }: { department?: string; color?: string }) {
  const theme = useTheme();
  if (!department) return null;
  return (
    <Chip
      size="small"
      label={department}
      sx={{
        backgroundColor: color ? withAlpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.1) : 'transparent',
        color: color || theme.palette.text.secondary,
        fontWeight: 600,
        border: color ? `1px solid ${withAlpha(color, theme.palette.mode === 'dark' ? 0.4 : 0.3)}` : `1px dashed ${theme.palette.divider}`,
        borderRadius: '8px',
        height: 24,
      }}
    />
  );
}

export function ProcedureBadge({ procedures }: { procedures?: string[] }) {
  const theme = useTheme();
  const count = procedures?.length ?? 0;
  if (count === 0) return null;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        height: 24,
        borderRadius: '8px',
        backgroundColor: theme.palette.custom.brand.lightest,
        border: `1px solid ${theme.palette.custom.brand.lighter}`,
        color: theme.palette.custom.brand.dark,
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    >
      <Box component="span" sx={{ fontSize: '0.6875rem', lineHeight: 1 }}>🧩</Box>
      <span>{count}</span>
    </Box>
  );
}

function getInitials(name: string) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_PALETTE = [
  'custom.brand.main',
  'custom.purple.main',
  'custom.cyan.main',
  'custom.pink.main',
  'custom.orange.main',
  'secondary.main',
];

function avatarColorFor(id: number, theme: Theme) {
  const paletteItem = AVATAR_PALETTE[id % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0] ?? 'custom.brand.main';
  const [group, key] = paletteItem.split('.') as [string, string];
  const groupObj = (theme.palette as unknown as Record<string, Record<string, string>>)[group];
  return groupObj?.[key] ?? theme.palette.primary.main;
}

export function DoctorAvatarGroup({ doctors, max = 3 }: { doctors?: SpecialtyDoctor[]; max?: number }) {
  const theme = useTheme();
  const list = doctors ?? [];
  if (list.length === 0) return null;
  const visible = list.slice(0, max);
  const overflow = list.length - visible.length;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ display: 'flex' }}>
        {visible.map((doc, i) => (
          <Tooltip key={doc.id} title={doc.name}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: avatarColorFor(doc.id, theme),
                color: '#fff',
                fontSize: '0.6875rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${theme.palette.background.paper}`,
                marginLeft: i > 0 ? -0.6 : 0,
                cursor: 'default',
              }}
            >
              {getInitials(doc.name)}
            </Box>
          </Tooltip>
        ))}
      </Box>
      {overflow > 0 && (
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: theme.palette.custom.surface.sunken,
            color: theme.palette.text.secondary,
            fontSize: '0.6875rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${theme.palette.background.paper}`,
            marginLeft: -0.6,
          }}
        >
          +{overflow}
        </Box>
      )}
    </Box>
  );
}

export function RowCardMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
