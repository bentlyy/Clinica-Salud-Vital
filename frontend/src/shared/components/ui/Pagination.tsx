import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
}

export const Pagination = memo(function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  if (start > 1) pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('...');
  if (end < totalPages) pages.push(totalPages);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 3 }}>
      <Button
        variant="outlined"
        size="small"
        aria-label={t('pagination.previous', 'Página anterior')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        sx={{ minWidth: 36, textTransform: 'none', borderColor: theme.palette.divider, color: theme.palette.text.primary }}
      >
        ←
      </Button>

      {pages.map((p, i) =>
        p === '...' ? (
          <Typography key={`ellipsis-${i}`} variant="body2" sx={{ color: theme.palette.text.secondary, px: 0.5 }}>
            …
          </Typography>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'contained' : 'outlined'}
            size="small"
            aria-label={t('pagination.pageNumber', 'Página {{page}}', { page: String(p) })}
            onClick={() => onPageChange(p as number)}
            sx={{
              minWidth: 36,
              textTransform: 'none',
              ...(p === page
                ? {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.background.paper,
                    '&:hover': { backgroundColor: theme.palette.primary.dark },
                  }
                : {
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.primary,
                    '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main },
                  }),
            }}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="outlined"
        size="small"
        aria-label={t('pagination.next', 'Página siguiente')}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        sx={{ minWidth: 36, textTransform: 'none', borderColor: theme.palette.divider, color: theme.palette.text.primary }}
      >
        →
      </Button>

      {total !== undefined && (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, ml: 2 }}>
          {total} {t('records')}
        </Typography>
      )}
    </Box>
  );
});
