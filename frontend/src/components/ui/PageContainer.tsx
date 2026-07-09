import { type ReactNode } from 'react';
import './PageContainer.css';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const widths = { sm: 640, md: 900, lg: 1100, xl: 1400, full: '100%' };

export function PageContainer({ children, maxWidth = 'md', className = '' }: PageContainerProps) {
  return <div className={`ds-page-container ${className}`} style={{ maxWidth: widths[maxWidth] }}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions, className = '' }: {
  title: string; subtitle?: string; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={`ds-page-header ${className}`}>
      <div className="ds-page-header__content">
        <h1 className="ds-page-header__title">{title}</h1>
        {subtitle && <p className="ds-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ds-page-header__actions">{actions}</div>}
    </div>
  );
}

export function PageSection({ title, subtitle, children, className = '' }: {
  title?: string; subtitle?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={`ds-page-section ${className}`}>
      {title && (
        <div className="ds-page-section__header">
          <h2 className="ds-page-section__title">{title}</h2>
          {subtitle && <p className="ds-page-section__subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
