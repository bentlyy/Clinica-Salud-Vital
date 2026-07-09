import { type ElementType, type HTMLAttributes, type ReactNode } from 'react';

// ─── Heading ───────────────────────────────────────────────────────────────────
type HeadingLevel = 'display' | 'h1' | 'h2' | 'h3' | 'h4';

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: ElementType;
  level?: HeadingLevel;
  children: ReactNode;
}

const Heading = ({ as, level = 'h2', className = '', children, ...props }: HeadingProps) => {
  const Tag = as ?? (level === 'display' ? 'h1' : level);
  const classes = ['ds-heading', `ds-heading--${level}`, className].filter(Boolean).join(' ');
  return <Tag className={classes} {...props}>{children}</Tag>;
};

// ─── Text ──────────────────────────────────────────────────────────────────────
type TextVariant = 'body' | 'sm' | 'xs' | 'lg';

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  as?: ElementType;
  variant?: TextVariant;
  children: ReactNode;
}

const Text = ({ as, variant = 'body', className = '', children, ...props }: TextProps) => {
  const Tag = as ?? 'p';
  const classes = ['ds-text', `ds-text--${variant}`, className].filter(Boolean).join(' ');
  return <Tag className={classes} {...props}>{children}</Tag>;
};

// ─── Label ─────────────────────────────────────────────────────────────────────
interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  as?: ElementType;
  children: ReactNode;
}

const Label = ({ as, className = '', children, ...props }: LabelProps) => {
  const Tag = as ?? 'label';
  const classes = ['ds-label', className].filter(Boolean).join(' ');
  return <Tag className={classes} {...props}>{children}</Tag>;
};

// ─── Caption ───────────────────────────────────────────────────────────────────
interface CaptionProps extends HTMLAttributes<HTMLSpanElement> {
  as?: ElementType;
  children: ReactNode;
}

const Caption = ({ as, className = '', children, ...props }: CaptionProps) => {
  const Tag = as ?? 'span';
  const classes = ['ds-caption', className].filter(Boolean).join(' ');
  return <Tag className={classes} {...props}>{children}</Tag>;
};

export { Heading, Text, Label, Caption };
