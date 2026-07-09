import { type ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: ReactNode;
  className?: string;
}

const Badge = ({ variant = 'neutral', size = 'md', dot = false, children, className = '' }: BadgeProps) => {
  const classes = [
    'ds-badge',
    `ds-badge--${variant}`,
    `ds-badge--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <span className="ds-badge__dot" />}
      {children}
    </span>
  );
};

export default Badge;
