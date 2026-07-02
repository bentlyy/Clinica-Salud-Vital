import React from 'react';
import { useI18n } from '../i18n/useI18n';

function LoadingState({ message, fullPage = false }: { message?: string; fullPage?: boolean }) {
  const { t } = useI18n();
  const displayMessage = message || t?.('loading_state.message') || 'Cargando...';
  return (
    <div className={`loading-state${fullPage ? ' loading-state-full' : ''}`}>
      <div className="loading-spinner" />
      <p className="loading-message">{displayMessage}</p>
    </div>
  );
}

export default React.memo(LoadingState);
