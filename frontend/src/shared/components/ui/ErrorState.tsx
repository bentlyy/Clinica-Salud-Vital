import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Refresh from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

interface ErrorStateProps {
  error?: AxiosError<{ error?: string }> | Error;
  onRetry?: () => void;
  variant?: 'default' | 'forbidden' | 'notFound';
}

export function ErrorState({ error, onRetry, variant = 'default' }: ErrorStateProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');

  const config = {
    default: {
      icon: <ErrorOutline sx={{ fontSize: 48, color: theme.palette.error.main }} />,
      title: t('error_default_title'),
      message: error?.message || t('error_default_message'),
    },
    forbidden: {
      icon: <ErrorOutline sx={{ fontSize: 48, color: theme.palette.warning.main }} />,
      title: t('error_forbidden_title'),
      message: t('error_forbidden_message'),
    },
    notFound: {
      icon: <ErrorOutline sx={{ fontSize: 48, color: theme.palette.text.secondary }} />,
      title: t('error_not_found_title'),
      message: t('error_not_found_message'),
    },
  };

  const { icon, title, message } = config[variant];

  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        gap: 2,
        textAlign: 'center',
      }}
    >
      {icon}
      <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, maxWidth: 400 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          {t('retry')}
        </Button>
      )}
    </Box>
  );
}
