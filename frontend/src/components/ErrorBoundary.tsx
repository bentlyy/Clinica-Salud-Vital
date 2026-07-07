import { Component } from 'react';
import { I18nContext } from '../i18n/useI18n';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = I18nContext;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const t = this.context?.t || ((key) => key);
      const title = t('error_boundary.title');
      const message = t('error_boundary.message');
      const retry = t('error_boundary.retry');
      const goHome = t('error_boundary.go_home');
      return (
        <div className="error-boundary">
          <h2 className="error-boundary__title">{title}</h2>
          <p className="error-boundary__message">
            {message}
          </p>
          <div className="error-boundary__actions">
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="error-boundary__btn error-boundary__btn--retry"
            >
              {retry}
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="error-boundary__btn"
            >
              {goHome}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
