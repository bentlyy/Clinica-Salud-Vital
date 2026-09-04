import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MotionDiv } from '@/shared/utils/animations';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const theme = useTheme();

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" component="div" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
      </Box>
    </MotionDiv>
  );
}
