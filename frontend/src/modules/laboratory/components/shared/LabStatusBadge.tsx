import type { LabRequestStatus } from '../../types';
import { LAB_STATUS_LABELS, LAB_STATUS_COLORS } from '../../types';

interface LabStatusBadgeProps {
  status: LabRequestStatus;
  size?: 'sm' | 'md';
}

export default function LabStatusBadge({ status, size = 'sm' }: LabStatusBadgeProps) {
  const color = LAB_STATUS_COLORS[status] || '#6b7280';
  const label = LAB_STATUS_LABELS[status] || status;
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize,
        fontWeight: 600,
        color: color,
        background: `${color}15`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
