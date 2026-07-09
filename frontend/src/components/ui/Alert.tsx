import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Alert({ variant = 'info', children, onClose, className = '', style }: AlertProps) {
  const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✕' };
  return (
    <div className={`ds-alert ds-alert--${variant} ${className}`} style={style} role="alert">
      <span className="ds-alert__icon">{icons[variant]}</span>
      <span className="ds-alert__text">{children}</span>
      {onClose && (
        <button className="ds-alert__close" onClick={onClose} aria-label="Cerrar">&times;</button>
      )}
    </div>
  );
}
