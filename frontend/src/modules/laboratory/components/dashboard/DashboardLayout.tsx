import type { ReactNode } from 'react';
import LabFullscreenToggle from '../shared/LabFullscreenToggle';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  areaSelector?: ReactNode;
  metricsBar?: ReactNode;
  alertsPanel?: ReactNode;
  children: ReactNode;
  viewSelector?: ReactNode;
}

export default function DashboardLayout({
  title, subtitle, headerExtra, areaSelector,
  metricsBar, alertsPanel, children, viewSelector,
}: DashboardLayoutProps) {
  return (
    <div className="page-container-wide" style={{ paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="10" y="6" width="28" height="36" rx="4" />
              <line x1="16" y1="16" x2="32" y2="16" />
              <line x1="16" y1="24" x2="32" y2="24" />
              <line x1="16" y1="32" x2="26" y2="32" />
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerExtra}
          <LabFullscreenToggle />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {areaSelector}
        {viewSelector}
      </div>

      {alertsPanel && <div style={{ marginBottom: 20 }}>{alertsPanel}</div>}

      {metricsBar && <div style={{ marginBottom: 24 }}>{metricsBar}</div>}

      {children}
    </div>
  );
}
