import { Box, Skeleton, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export function LoadingSpecialties() {
  const theme = useTheme();

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Paper key={i} sx={{ p: 2, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '12px' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="60%" height={22} />
                <Skeleton width="40%" height={16} />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
      {[0, 1, 2].map((i) => (
        <Paper
          key={i}
          sx={{ p: 2.5, mb: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '12px' }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="35%" height={22} />
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={16} />
            </Box>
            <Skeleton width={90} height={32} />
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
