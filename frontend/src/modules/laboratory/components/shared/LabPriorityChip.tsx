import type { LabPriority } from '../../types';
import { LAB_PRIORITY_LABELS, LAB_PRIORITY_COLORS } from '../../types';

interface LabPriorityChipProps {
  priority: LabPriority;
}

export default function LabPriorityChip({ priority }: LabPriorityChipProps) {
  const color = LAB_PRIORITY_COLORS[priority] || '#6b7280';
  const label = LAB_PRIORITY_LABELS[priority] || priority;

  if (priority === 'urgent' || priority === 'emergency') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          background: color,
          animation: priority === 'emergency' ? 'pulse 1.5s infinite' : 'none',
        }}
      >
        <span>●</span>
        {label}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: color,
        background: `${color}15`,
      }}
    >
      {label}
    </span>
  );
}
