import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  useTheme,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import Person from '@mui/icons-material/Person';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Science from '@mui/icons-material/Science';
import Receipt from '@mui/icons-material/Receipt';
import Settings from '@mui/icons-material/Settings';
import Notifications from '@mui/icons-material/Notifications';
import Logout from '@mui/icons-material/Logout';
import Home from '@mui/icons-material/Home';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useThemeMode } from '@/shared/providers/ThemeProvider';
import { getRoleColor } from '@/shared/utils/role.utils';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

const TOPBAR_HEIGHT = 64;

const patientNavItemsDef = [
  { labelKey: 'patient_nav.home', icon: <Home />, path: '/patient' },
  { labelKey: 'patient_nav.bookings', icon: <CalendarMonth />, path: '/patient/bookings' },
  { labelKey: 'patient_nav.history', icon: <Receipt />, path: '/patient/clinical-records' },
  { labelKey: 'patient_nav.laboratory', icon: <Science />, path: '/patient/laboratory' },
  { labelKey: 'patient_nav.profile', icon: <Person />, path: '/patient/settings' },
];

export function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation();

  const patientNavItems = patientNavItemsDef.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const bottomNavIdx = patientNavItems.findIndex(
    (item) => item.path === location.pathname || location.pathname.startsWith(item.path + '/'),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Topbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ height: TOPBAR_HEIGHT, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              C
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}>
              {t('patient_nav:portal')}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={3} color="error" variant="dot">
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>

            <LanguageSwitcher />

            <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={toggleTheme}>
              {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: user ? getRoleColor(user.role) : 'success.dark',
                  fontSize: '0.75rem',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2, border: `1px solid ${theme.palette.divider}` } } }}
          >
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/patient/settings'); }}>
              <Settings sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
              {t('settings')}
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ color: 'error.main' }}>
              <Logout sx={{ mr: 1.5, fontSize: 18 }} />
              {t('logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: theme.palette.background.default,
          p: { xs: 2, md: 3 },
          pb: { xs: 10, md: 3 },
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNavigation
          value={bottomNavIdx >= 0 ? bottomNavIdx : 0}
          onChange={(_, newValue) => {
            navigate(patientNavItems[newValue]!.path);
          }}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              '&.Mui-selected': { color: 'primary.main' },
            },
          }}
        >
          {patientNavItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      )}
    </Box>
  );
}
