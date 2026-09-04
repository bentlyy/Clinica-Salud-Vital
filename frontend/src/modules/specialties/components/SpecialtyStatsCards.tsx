import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import MedicalServices from '@mui/icons-material/MedicalServices';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import type { Specialty } from '../types/specialty.types';
import { formatNumber } from '@/shared/utils/localeUtils';

interface SpecialtyStatsCardsProps {
  specialties: Specialty[];
  isSuperAdmin: boolean;
  clinicCount?: number;
}

export function SpecialtyStatsCards({ specialties, isSuperAdmin, clinicCount = 0 }: SpecialtyStatsCardsProps) {
  const { t } = useTranslation('specialties');
  const theme = useTheme();

  const totalDoctors = specialties.reduce((acc, s) => acc + (s.doctors?.length ?? 0), 0);
  const totalProcedures = specialties.reduce((acc, s) => acc + (s.procedures?.length ?? 0), 0);
  const totalClinics = new Set(specialties.map((s) => s.tenant_id)).size;

  const cards = [
    {
      key: 'specialties',
      label: t('statsSpecialties'),
      value: formatNumber(specialties.length),
      icon: <MedicalServices sx={{ fontSize: 20 }} />,
      color: theme.palette.primary.main,
      bg: theme.palette.custom.brand.lightest,
    },
    {
      key: 'doctors',
      label: t('statsDoctors'),
      value: formatNumber(totalDoctors),
      icon: <PeopleOutline sx={{ fontSize: 20 }} />,
      color: theme.palette.secondary.main,
      bg: theme.palette.custom.purple.bg,
    },
    {
      key: 'procedures',
      label: t('statsProcedures'),
      value: formatNumber(totalProcedures),
      icon: <CategoryOutlined sx={{ fontSize: 20 }} />,
      color: theme.palette.info.main,
      bg: theme.palette.custom.status.info.bg,
    },
  ];

  if (isSuperAdmin) {
    cards.push({
      key: 'clinics',
      label: t('statsClinics'),
      value: formatNumber(totalClinics || clinicCount),
      icon: <LocationOnOutlined sx={{ fontSize: 20 }} />,
      color: theme.palette.warning.main,
      bg: theme.palette.custom.status.warning.bg,
    });
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${cards.length}, 1fr)` },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map((card) => (
        <Paper
          key={card.key}
          sx={{
            p: 2,
            borderRadius: '14px',
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: card.bg,
              color: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {card.icon}
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}
            >
              {card.value}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {card.label}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
