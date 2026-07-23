import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { MotionDiv } from '@/shared/utils/animations';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
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
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" component="div" sx={{ color: '#6b7280', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
      </Box>
    </MotionDiv>
  );
}
