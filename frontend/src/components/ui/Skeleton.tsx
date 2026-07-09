interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'card' | 'badge';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  return (
    <div
      className={`ds-skeleton ds-skeleton--${variant} ${className}`}
      style={{ width, height }}
    />
  );
}
