import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import ArrowForward from '@mui/icons-material/ArrowForward';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

export function SectionCard({ title, description, icon, path, color, bgColor }: SectionCardProps) {
  const theme = useTheme();

  return (
    <Paper
      component={Link}
      to={path}
      sx={{
        p: 2,
        borderRadius: '14px',
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        height: '100%',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          boxShadow: theme.shadows[3],
          transform: 'translateY(-2px)',
          borderColor: `${color}66`,
        },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: '12px',
          backgroundColor: bgColor,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, display: 'block', mt: 0.25 }}
        >
          {description}
        </Typography>
      </Box>
      <ArrowForward
        sx={{ fontSize: 18, color: theme.palette.text.secondary, flexShrink: 0, opacity: 0.5 }}
      />
    </Paper>
  );
}
