import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Construction from '@mui/icons-material/Construction';
import { useTranslation } from 'react-i18next';

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');

  return (
    <Box>
      <Paper
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: 2,
          border: `2px dashed ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Construction sx={{ fontSize: 48, color: theme.palette.divider }} />
        <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {t('placeholder_coming_soon')}
        </Typography>
      </Paper>
    </Box>
  );
}
