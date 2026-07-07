import type { ReactNode } from 'react';

interface LabSplitViewProps {
  master: ReactNode;
  detail: ReactNode | null;
  defaultWidth?: number;
}

export default function LabSplitView({ master, detail, defaultWidth = 450 }: LabSplitViewProps) {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {master}
      </div>
      {detail && (
        <div style={{
          width: defaultWidth,
          flexShrink: 0,
          borderLeft: '1px solid var(--border-light)',
          overflow: 'auto',
        }}>
          {detail}
        </div>
      )}
    </div>
  );
}
