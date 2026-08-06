import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Grid,
  Chip,
  Avatar,
  Skeleton,
  Alert,
  InputAdornment,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Science from '@mui/icons-material/Science';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { getLabTests } from '../services/lab.service';
import { formatNumber } from '@/shared/utils/localeUtils';
import { getLabIcon, getLabColor } from '@/shared/components/lab-icons/LabIcons';
import type { LabTest } from '../types/lab.types';

const CATEGORY_MAP: Record<string, string> = {
  HEM: 'Hematología',
  GLU: 'Glucosa',
  LIP: 'Lípidos',
  CRE: 'Riñón',
  TSH: 'Tiroides',
  URO: 'Orina',
  HBA: 'HbA1c',
  PCR: 'Inflamación',
  ALT: 'Hígado',
};

function getCategoryLabel(test: LabTest): string {
  const prefix = test.code?.slice(0, 3)?.toUpperCase();
  return CATEGORY_MAP[prefix] || test.category || 'General';
}

function getCategoryIcon(test: LabTest): React.ReactNode {
  const prefix = test.code?.slice(0, 3)?.toUpperCase();
  const Icon = getLabIcon(prefix || '');
  return <Icon />;
}

function getCategoryColor(test: LabTest): string {
  const prefix = test.code?.slice(0, 3)?.toUpperCase();
  return getLabColor(prefix || '');
}

export default function LabTestsCatalogPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const testsData = await getLabTests({});
        setTests(testsData);
      } catch {
        setError(t('lab_catalog:errorLoading'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = tests;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q),
      );
    }
    if (activeCategory !== 'all') {
      result = result.filter((item) => {
        const prefix = item.code?.slice(0, 3)?.toUpperCase();
        const cat = CATEGORY_MAP[prefix] || item.category;
        return cat === activeCategory;
      });
    }
    return result;
  }, [tests, search, activeCategory]);

  const categories = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const item of tests) {
      const cat = getCategoryLabel(item);
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    }
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [tests]);

  const grouped = useMemo(() => {
    const map = new Map<string, LabTest[]>();
    for (const item of filtered) {
      const cat = getCategoryLabel(item);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <Box>
      <PageHeader title={t('lab_catalog:title')} />

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('lab_catalog:searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
        />
      </Paper>

      {/* Category filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Chip
          label={t('lab_catalog:all', { count: tests.length })}
          onClick={() => setActiveCategory('all')}
          variant={activeCategory === 'all' ? 'filled' : 'outlined'}
          sx={{
            cursor: 'pointer',
            ...(activeCategory === 'all'
              ? { backgroundColor: theme.palette.primary.main, color: theme.palette.background.paper }
              : { borderColor: theme.palette.divider }),
          }}
        />
        {categories.map(([cat, count]) => (
          <Chip
            key={cat}
            label={`${cat} (${count})`}
            onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
            variant={activeCategory === cat ? 'filled' : 'outlined'}
            sx={{
              cursor: 'pointer',
              ...(activeCategory === cat
                ? { backgroundColor: theme.palette.primary.main, color: theme.palette.background.paper }
                : { borderColor: theme.palette.divider }),
            }}
          />
        ))}
      </Box>

      {/* Content */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: '12px' }} />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
      ) : grouped.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
          <Science sx={{ fontSize: 48, color: theme.palette.divider, mb: 1 }} />
          <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
            {t('lab_catalog:noResults')}
          </Typography>
        </Paper>
      ) : (
        grouped.map(([category, categoryTests]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 2, fontSize: 18 }}>
              {category} ({categoryTests.length})
            </Typography>
            <Grid container spacing={2}>
              {categoryTests.map((test) => (
                <Grid xs={12} sm={6} md={4} key={test.id}>
                  <Paper
                    sx={{
                      p: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '12px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: getCategoryColor(test),
                        boxShadow: `0 4px 12px ${getCategoryColor(test)}22`,
                      },
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: `${getCategoryColor(test)}15`,
                          color: getCategoryColor(test),
                        }}
                      >
                        {getCategoryIcon(test)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                          {test.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {test.code}
                        </Typography>
                      </Box>
                      <Chip
                        label={`$${formatNumber(test.price)}`}
                        size="small"
                        sx={{ backgroundColor: theme.palette.custom.status.success.bg, color: theme.palette.custom.status.success.text, fontWeight: 600, fontSize: 11 }}
                      />
                    </Box>

                    {/* Description */}
                    {test.description && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1.5, lineHeight: 1.5, flex: 1 }}>
                        {test.description}
                      </Typography>
                    )}

                    {/* Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                      {test.unit && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {t('lab_catalog:unit')} <strong style={{ color: theme.palette.text.primary }}>{test.unit}</strong>
                        </Typography>
                      )}
                      {test.turnaround_time_min > 0 && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {t('lab_catalog:turnaround')} <strong style={{ color: theme.palette.text.primary }}>{test.turnaround_time_min} min</strong>
                        </Typography>
                      )}
                    </Box>

                    {/* Preparation */}
                    {test.preparation_instructions && (
                      <Box sx={{ backgroundColor: theme.palette.custom.status.info.bg, borderRadius: '8px', p: 1, mb: 1 }}>
                        <Typography variant="caption" sx={{ color: theme.palette.info.dark, fontWeight: 500 }}>
                          {t('lab_catalog:preparation')} {test.preparation_instructions}
                        </Typography>
                      </Box>
                    )}

                    {/* Reference ranges */}
                    {test.reference_ranges && Object.keys(test.reference_ranges).length > 0 && (
                      <Box sx={{ mt: 'auto' }}>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                          {t('lab_catalog:refRanges')}
                        </Typography>
                        {Object.entries(test.reference_ranges).slice(0, 3).map(([group, range]) => (
                          <Typography key={group} variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                            {group}: {range.min} — {range.max}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
    </Box>
  );
}
