interface DividerProps {
  className?: string;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Divider({ className = '', spacing = 'md' }: DividerProps) {
  const margins = { none: '0', sm: 'var(--ds-spacing-2)', md: 'var(--ds-spacing-4)', lg: 'var(--ds-spacing-6)' };
  return (
    <hr
      className={`ds-divider ${className}`}
      style={{ marginTop: margins[spacing], marginBottom: margins[spacing] }}
    />
  );
}
