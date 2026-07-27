import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        textAlign: 'center',
        px: 2,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: '6rem',
          fontWeight: 800,
          color: theme.palette.divider,
          lineHeight: 1,
          mb: 1,
        }}
      >
        404
      </Typography>

      <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
        {t('not_found.title', 'Página no encontrada')}
      </Typography>

      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 4, maxWidth: 400 }}>
        {t('not_found.message', 'La página que buscas no existe o fue movida.')}
      </Typography>

      <Button
        component={Link}
        to="/"
        variant="contained"
        sx={{
          backgroundColor: theme.palette.primary.main,
          '&:hover': { backgroundColor: theme.palette.primary.dark },
          textTransform: 'none',
          fontWeight: 600,
          px: 4,
          py: 1.5,
          borderRadius: '10px',
        }}
      >
        {t('not_found.go_home', 'Volver al inicio')}
      </Button>
    </Box>
  );
}
