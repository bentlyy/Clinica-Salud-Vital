import { Component, Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Box, Button, Typography, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorBoundaryInnerProps {
  children: ReactNode;
  t: TFunction;
  navigate: (path: string) => void;
}

interface ErrorBoundaryInnerState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, ErrorBoundaryInnerState> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryInnerState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, error: null, resetKey: prev.resetKey + 1 }));
  };

  handleGoHome = () => {
    this.props.navigate('/dashboard');
  };

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="background.default"
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              {t('error_boundary:title', 'Algo salió mal')}
            </Typography>
            <Box role="alert" aria-live="assertive">
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {t('error_boundary:message', 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.')}
              </Typography>
            </Box>
            {this.state.error && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', mb: 3, fontFamily: 'monospace' }}
              >
                {this.state.error.message}
              </Typography>
            )}
            <Box display="flex" gap={2} justifyContent="center">
              <Button variant="contained" onClick={this.handleRetry}>
                {t('error_boundary:retry', 'Reintentar')}
              </Button>
              <Button variant="outlined" onClick={this.handleGoHome}>
                {t('error_boundary:go_home', 'Ir al inicio')}
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}

function ErrorBoundary({ children, t }: { children: ReactNode; t: TFunction }) {
  const navigate = useNavigate();
  return (
    <ErrorBoundaryInner t={t} navigate={navigate}>
      {children}
    </ErrorBoundaryInner>
  );
}

export default withTranslation()(ErrorBoundary);
