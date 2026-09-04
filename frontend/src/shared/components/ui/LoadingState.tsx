import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const displayMessage = message ?? t('loading');

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
      }}
    >
      <CircularProgress size={40} sx={{ color: theme.palette.primary.main }} />
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
        {displayMessage}
      </Typography>
    </Box>
  );
}
