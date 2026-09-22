import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography, Button, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Seo } from '@/shared/components/Seo';

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  updated?: string;
  children: ReactNode;
}

export function LegalLayout({ title, subtitle, updated, children }: LegalLayoutProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation('legal');

  const formattedDate = updated
    ? new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(updated))
    : '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="md">
        <Button
          component={Link}
          to="/"
          variant="text"
          startIcon={<span aria-hidden>←</span>}
          sx={{ mb: 3, textTransform: 'none', fontWeight: 600 }}
        >
          {t('back')}
        </Button>
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
          <Seo title={title} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              {subtitle}
            </Typography>
          )}
          {formattedDate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('updated')}: {formattedDate}
            </Typography>
          )}
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ '& p': { lineHeight: 1.7, color: theme.palette.text.secondary } }}>{children}</Box>
        </Paper>
      </Container>
    </Box>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography component="div" variant="body1">
        {children}
      </Typography>
    </Box>
  );
}