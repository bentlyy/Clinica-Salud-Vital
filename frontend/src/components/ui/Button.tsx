import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const classes = [
    'ds-btn',
    `ds-btn--${variant}`,
    `ds-btn--${size}`,
    loading ? 'ds-btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {loading && <span className="ds-btn__spinner" />}
      {!loading && icon && <span className="ds-btn__icon">{icon}</span>}
      {children && <span className="ds-btn__text">{children}</span>}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
