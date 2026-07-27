import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Menu, MenuItem, Tooltip, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LanguageIcon from '@mui/icons-material/Language';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

export function LanguageSwitcher() {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Idioma">
        <IconButton
          size="small"
          sx={{ color: theme.palette.text.secondary, gap: 0.5 }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Typography component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>
            {currentLang.flag}
          </Typography>
          <LanguageIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 160, borderRadius: 2, border: `1px solid ${theme.palette.divider}` } } }}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            selected={lang.code === i18n.language}
            onClick={() => handleChange(lang.code)}
            sx={{ gap: 1.5 }}
          >
            <Box component="span" sx={{ fontSize: '1.1rem' }}>
              {lang.flag}
            </Box>
            <Typography variant="body2" component="span">
              {lang.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
