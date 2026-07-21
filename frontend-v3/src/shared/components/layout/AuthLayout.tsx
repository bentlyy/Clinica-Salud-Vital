import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        p: 2,
      }}
    >
      <Outlet />
    </Box>
  );
}
