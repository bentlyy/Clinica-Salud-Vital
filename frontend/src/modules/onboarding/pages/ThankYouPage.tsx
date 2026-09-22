import { Box, Button, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Seo } from '@/shared/components/Seo';

export default function ThankYouPage() {
  const theme = useTheme();
  const { t } = useTranslation('thanks');

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'background.default' }}>
      <Seo title={t('title')} />
      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          borderRadius: 3,
        }}
      >
        <CheckCircleOutline sx={{ fontSize: 64, color: theme.palette.success.main, mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {t('title')}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
          {t('subtitle')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {t('description')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {t('notes')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button component={Link} to="/" variant="contained" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('back')}
          </Button>
          <Button component={Link} to="/contratar" variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('newRequest')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}