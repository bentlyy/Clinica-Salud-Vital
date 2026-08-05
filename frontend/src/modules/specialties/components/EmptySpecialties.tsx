import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import MedicalServices from '@mui/icons-material/MedicalServices';

interface EmptySpecialtiesProps {
  hasSearch: boolean;
  onCreate: () => void;
}

export function EmptySpecialties({ hasSearch, onCreate }: EmptySpecialtiesProps) {
  const { t } = useTranslation('specialties');
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
        borderRadius: '14px',
        border: `1px dashed ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '18px',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(13,148,136,0.15)' : '#f0fdfa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <MedicalServices sx={{ fontSize: 32, color: theme.palette.primary.main }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5 }}>
        {t('notFound')}
      </Typography>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3, maxWidth: 360 }}>
        {hasSearch ? t('emptySearch') : t('emptyNone')}
      </Typography>
      {!hasSearch && (
        <Button variant="contained" onClick={onCreate}>
          {t('newSpecialty')}
        </Button>
      )}
    </Box>
  );
}
