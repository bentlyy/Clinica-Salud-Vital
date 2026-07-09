import Badge from './Badge';

type StatusSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: string;
  size?: StatusSize;
  className?: string;
}

const STATUS_MAP: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'; label: string }> = {
  confirmed: { variant: 'success', label: 'Confirmed' },
  active: { variant: 'success', label: 'Active' },
  completed: { variant: 'success', label: 'Completed' },
  paid: { variant: 'success', label: 'Paid' },
  approved: { variant: 'success', label: 'Approved' },
  available: { variant: 'success', label: 'Available' },
  verified: { variant: 'success', label: 'Verified' },

  pending: { variant: 'warning', label: 'Pending' },
  scheduled: { variant: 'warning', label: 'Scheduled' },
  awaiting: { variant: 'warning', label: 'Awaiting' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  processing: { variant: 'warning', label: 'Processing' },
  unfinished: { variant: 'warning', label: 'Unfinished' },

  cancelled: { variant: 'danger', label: 'Cancelled' },
  canceled: { variant: 'danger', label: 'Canceled' },
  declined: { variant: 'danger', label: 'Declined' },
  rejected: { variant: 'danger', label: 'Rejected' },
  failed: { variant: 'danger', label: 'Failed' },
  expired: { variant: 'danger', label: 'Expired' },
  inactive: { variant: 'danger', label: 'Inactive' },
  unavailable: { variant: 'danger', label: 'Unavailable' },

  draft: { variant: 'neutral', label: 'Draft' },
  archived: { variant: 'neutral', label: 'Archived' },
  paused: { variant: 'neutral', label: 'Paused' },
  on_hold: { variant: 'neutral', label: 'On Hold' },

  booked: { variant: 'primary', label: 'Booked' },
  info: { variant: 'info', label: 'Info' },
  updated: { variant: 'info', label: 'Updated' },
  modified: { variant: 'info', label: 'Modified' },
};

const StatusBadge = ({ status, size = 'md', className = '' }: StatusBadgeProps) => {
  const normalized = status?.toLowerCase().trim() ?? '';
  const config = STATUS_MAP[normalized] ?? { variant: 'neutral' as const, label: normalized || status };

  const classes = [
    'ds-status-badge',
    `ds-status-badge--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <Badge variant={config.variant} size={size} dot>
        {config.label}
      </Badge>
    </span>
  );
};

export default StatusBadge;
