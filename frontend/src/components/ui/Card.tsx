import { type HTMLAttributes, type ReactNode } from 'react';

type CardVariant = 'default' | 'elevated' | 'subtle' | 'bordered' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  children: ReactNode;
}

const Card = ({ variant = 'default', padding = 'md', hover = false, className = '', children, ...props }: CardProps) => {
  const classes = [
    'ds-card',
    `ds-card--${variant}`,
    `ds-card--pad-${padding}`,
    hover ? 'ds-card--hover' : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props}>{children}</div>;
};

export default Card;
