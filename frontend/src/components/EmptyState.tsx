import React from 'react';

function EmptyState({ icon = '📋', title, message, action }: { icon?: string; title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      {title && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default React.memo(EmptyState);
