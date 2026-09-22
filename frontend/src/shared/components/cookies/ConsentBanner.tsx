import { useState } from 'react';
import { Box, Paper, Typography, Button, Slide } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'vitaria_cookie_consent';

export interface CookieConsentChoice {
  analytics: boolean;
}

export function getCookieConsent(): CookieConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentChoice;
    return typeof parsed.analytics === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(choice: CookieConsentChoice): void {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(choice));
}

export function ConsentBanner() {
  const theme = useTheme();
  const { t } = useTranslation('cookies');
  const [visible, setVisible] = useState<boolean>(() => getCookieConsent() === null);

  if (!visible) return null;

  const handleAccept = () => {
    setCookieConsent({ analytics: true });
    setVisible(false);
  };

  const handleDecline = () => {
    setCookieConsent({ analytics: false });
    setVisible(false);
  };

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Paper
        role="dialog"
        aria-label="Cookie consent"
        elevation={6}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: { xs: 12, md: 24 },
          right: { xs: 12, md: 'auto' },
          maxWidth: 560,
          p: 3,
          borderRadius: 3,
          zIndex: theme.zIndex.snackbar,
        }}
      >
        <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
          {t('message')}{' '}
          <Link to="/privacidad" style={{ color: theme.palette.primary.main, fontWeight: 600 }}>
            {t('privacy')}
          </Link>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="contained" size="small" onClick={handleAccept} sx={{ textTransform: 'none' }}>
            {t('accept')}
          </Button>
          <Button variant="outlined" size="small" onClick={handleDecline} sx={{ textTransform: 'none' }}>
            {t('decline')}
          </Button>
        </Box>
      </Paper>
    </Slide>
  );
}