import React from 'react';
import { useI18n } from '../i18n/useI18n';

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="alert alert-error error-state">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-sm error-state__btn">
          {t('error_state.retry') || 'Reintentar'}
        </button>
      )}
    </div>
  );
}

export default React.memo(ErrorState);
