import type { JSX } from 'react';

const SIZE = 48;
const stroke = 'currentColor';
const fill = 'none';

const iconProps = {
  width: SIZE,
  height: SIZE,
  viewBox: '0 0 48 48',
  fill,
  stroke,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

interface Props {
  size?: number;
  color?: string;
}

export function BloodTestIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <path d="M24 6 C24 6 14 20 14 28 C14 33.5 18.5 40 24 40 C29.5 40 34 33.5 34 28 C34 20 24 6 24 6Z" />
      <circle cx="24" cy="28" r="3" fill={color || '#ef4444'} stroke="none" opacity="0.6" />
      <line x1="24" y1="16" x2="24" y2="22" strokeWidth="2.5" />
    </svg>
  );
}

export function GlucoseIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <rect x="8" y="6" width="32" height="36" rx="4" />
      <line x1="14" y1="14" x2="34" y2="14" />
      <line x1="14" y1="20" x2="28" y2="20" />
      <line x1="14" y1="26" x2="34" y2="26" />
      <line x1="14" y1="32" x2="22" y2="32" />
      <circle cx="34" cy="34" r="6" fill={color || '#f59e0b'} stroke="none" opacity="0.5" />
    </svg>
  );
}

export function LipidIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="8" fill={color || '#f59e0b'} stroke="none" opacity="0.3" />
      <line x1="24" y1="8" x2="24" y2="16" />
      <line x1="24" y1="32" x2="24" y2="40" />
      <line x1="8" y1="24" x2="16" y2="24" />
      <line x1="32" y1="24" x2="40" y2="24" />
      <circle cx="24" cy="24" r="3" fill={color || '#f59e0b'} stroke="none" />
    </svg>
  );
}

export function KidneyIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <path d="M14 12 C8 12 6 20 8 28 C10 36 14 40 18 40 C22 40 24 34 24 28 C24 22 26 16 30 16 C34 16 38 20 40 28 C42 36 40 40 34 40" />
      <line x1="18" y1="20" x2="18" y2="34" strokeWidth="2.5" />
      <line x1="24" y1="24" x2="24" y2="30" strokeWidth="2.5" />
    </svg>
  );
}

export function ThyroidIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <path d="M14 16 C10 16 8 22 10 28 C12 34 16 36 20 34 C24 32 24 24 24 24 C24 24 24 32 28 34 C32 36 36 34 38 28 C40 22 38 16 34 16" />
      <circle cx="24" cy="14" r="4" fill={color || '#8b5cf6'} stroke="none" opacity="0.5" />
      <line x1="24" y1="10" x2="24" y2="6" />
    </svg>
  );
}

export function UrineIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <rect x="15" y="6" width="18" height="12" rx="2" />
      <path d="M17 18 L15 42 C15 43.1 15.9 44 17 44 L31 44 C32.1 44 33 43.1 33 42 L31 18" />
      <line x1="20" y1="24" x2="28" y2="24" />
      <line x1="20" y1="30" x2="28" y2="30" />
      <line x1="20" y1="36" x2="25" y2="36" />
      <rect x="21" y="8" width="6" height="4" rx="1" fill={color || '#f59e0b'} stroke="none" opacity="0.4" />
    </svg>
  );
}

export function HbA1cIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <circle cx="24" cy="24" r="16" fill={color || '#ef4444'} stroke="none" opacity="0.08" />
      <path d="M24 10 C24 10 16 22 16 28 C16 32.4 19.6 36 24 36 C28.4 36 32 32.4 32 28 C32 22 24 10 24 10Z" />
      <line x1="24" y1="22" x2="24" y2="30" strokeWidth="2.5" />
      <circle cx="24" cy="18" r="1.5" fill={color || '#ef4444'} stroke="none" />
    </svg>
  );
}

export function InflammationIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <circle cx="18" cy="18" r="8" fill={color || '#f97316'} stroke="none" opacity="0.2" />
      <circle cx="30" cy="18" r="6" fill={color || '#f97316'} stroke="none" opacity="0.2" />
      <circle cx="24" cy="30" r="10" fill={color || '#f97316'} stroke="none" opacity="0.2" />
      <circle cx="18" cy="18" r="3" fill={color || '#f97316'} stroke="none" />
      <circle cx="30" cy="18" r="2" fill={color || '#f97316'} stroke="none" />
      <circle cx="24" cy="30" r="4" fill={color || '#f97316'} stroke="none" />
    </svg>
  );
}

export function LiverIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <path d="M24 6 C18 6 10 12 10 22 C10 30 14 36 18 38 C20 39 22 38 22 36 C22 34 20 32 20 30 C20 26 24 24 24 24 C24 24 28 26 28 30 C28 32 26 34 26 36 C26 38 28 39 30 38 C34 36 38 30 38 22 C38 12 30 6 24 6Z" />
      <line x1="24" y1="10" x2="24" y2="16" strokeWidth="2.5" />
    </svg>
  );
}

export function LabIcon({ size = SIZE, color }: Props) {
  return (
    <svg {...iconProps} width={size} height={size} color={color}>
      <rect x="10" y="6" width="28" height="36" rx="4" />
      <rect x="14" y="10" width="20" height="14" rx="2" fill={color || '#06b6d4'} stroke="none" opacity="0.15" />
      <line x1="16" y1="28" x2="32" y2="28" />
      <line x1="16" y1="32" x2="32" y2="32" />
      <line x1="16" y1="36" x2="26" y2="36" />
    </svg>
  );
}

const ICON_MAP: Record<string, (props: Props) => JSX.Element> = {
  hemograma: BloodTestIcon,
  glucosa: GlucoseIcon,
  lipídico: LipidIcon,
  perfil: LipidIcon,
  creatinina: KidneyIcon,
  tsh: ThyroidIcon,
  urocultivo: UrineIcon,
  hemoglobina: HbA1cIcon,
  pcr: InflammationIcon,
  transaminasas: LiverIcon,
  default: LabIcon,
};

export function getLabIcon(name: string): (props: Props) => JSX.Element {
  const key = name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  for (const [k, icon] of Object.entries(ICON_MAP)) {
    if (key.includes(k)) return icon;
  }
  return ICON_MAP.default;
}

export const LAB_COLORS: Record<string, string> = {
  hemograma: '#ef4444',
  glucosa: '#f59e0b',
  lipídico: '#f59e0b',
  perfil: '#f59e0b',
  creatinina: '#06b6d4',
  tsh: '#8b5cf6',
  urocultivo: '#10b981',
  hemoglobina: '#ef4444',
  pcr: '#f97316',
  transaminasas: '#22c55e',
};

export function getLabColor(name: string): string {
  const key = name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  for (const [k, color] of Object.entries(LAB_COLORS)) {
    if (key.includes(k)) return color;
  }
  return '#06b6d4';
}
