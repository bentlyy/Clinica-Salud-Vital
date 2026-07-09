import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  label: string;
  children: ReactNode;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  size = 'md',
  label,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const classes = [
    'ds-icon-btn',
    `ds-icon-btn--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled}
      aria-label={label}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
