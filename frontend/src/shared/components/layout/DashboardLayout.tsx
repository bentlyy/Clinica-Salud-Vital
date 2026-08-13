import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import Person from '@mui/icons-material/Person';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFeature } from '@/shared/hooks/useFeature';
import { useThemeMode } from '@/shared/providers/ThemeProvider';
import { getRoleLabel, getRoleColor } from '@/shared/utils/role.utils';
import { getNavItems } from '@/shared/constants/navigation';
import { useTranslation } from 'react-i18next';
import { SidebarItem } from './SidebarItem';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 72;
const TOPBAR_HEIGHT = 64;

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { hasFeature } = useFeature();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation('nav');
  const { t: tc } = useTranslation('common');

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const navItems = user ? getNavItems(user.role, t) : [];

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: sidebarWidth },
          flexShrink: 0,
          transition: 'width 0.2s ease-in-out',
        }}
      >
        {/* Mobile overlay */}
        {isMobile && (
          <Box
            onClick={() => setSidebarOpen(false)}
            sx={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: theme.zIndex.drawer - 1,
              display: sidebarOpen ? 'block' : 'none',
            }}
          />
        )}

        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              transition: 'width 0.2s ease-in-out',
              overflowX: 'hidden',
            },
          }}
        >
          {/* Sidebar header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              px: sidebarOpen ? 2 : 1,
              py: 2,
              height: TOPBAR_HEIGHT,
            }}
          >
            {sidebarOpen && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.contrastText',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                >
                  C
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {tc('appName')}
                </Typography>
              </Box>
            )}
            <IconButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              {sidebarOpen ? <ChevronLeft /> : <MenuIcon />}
            </IconButton>
          </Box>

          {/* Nav items */}
          <Box sx={{ flex: 1, overflowY: 'auto', pb: 2.5, pt: 1.25 }}>
            {sidebarOpen && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2.5,
                  pt: 0.5,
                  pb: 1,
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  letterSpacing: 1.2,
                }}
              >
                {tc('menu')}
              </Typography>
            )}
            {navItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                active={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                collapsed={!sidebarOpen}
                onClick={handleNavClick}
                subItems={item.children}
                locked={item.featureKey ? !hasFeature(item.featureKey) : false}
              />
            ))}
          </Box>

          {/* Sidebar footer */}
          {sidebarOpen && user && (
            <Box
              onClick={() => navigate('/settings')}
              sx={{
                p: 1.5,
                m: 1.5,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.background.paper,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                transition: 'background-color 0.15s, border-color 0.15s',
                '&:hover': {
                  backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.hover,
                  borderColor: theme.palette.custom?.brand?.light || theme.palette.divider,
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: getRoleColor(user.role),
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {user.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {getRoleLabel(user.role, tc)}
                </Typography>
              </Box>
              <Tooltip title={tc('logout')}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                  sx={{ color: 'text.secondary', '&:hover': { color: theme.palette.error.main } }}
                >
                  <Logout fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Drawer>
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          <Toolbar sx={{ height: TOPBAR_HEIGHT, px: { xs: 2, md: 3 } }}>
            {(!sidebarOpen || isMobile) && (
              <IconButton
                edge="start"
                onClick={() => setSidebarOpen(true)}
                sx={{ mr: 1, color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Box sx={{ flex: 1 }} />

            {/* Topbar actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {user?.role !== 'patient' && user?.role !== 'user' && <NotificationBell />}

              <LanguageSwitcher />

              <Tooltip title={mode === 'dark' ? tc('theme_light') : tc('theme_dark')}>
                <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={toggleTheme}>
                  {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </IconButton>
              </Tooltip>

              <Tooltip title={tc('settings')}>
                <IconButton
                  size="small"
                  sx={{ color: 'text.secondary' }}
                  onClick={() => navigate('/settings')}
                >
                  <Settings fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={tc('account')}>
                <IconButton onClick={handleProfileMenuOpen} size="small" sx={{ ml: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: user ? getRoleColor(user.role) : 'text.secondary',
                      fontSize: '0.75rem',
                    }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Box>

            {/* Profile menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2, border: `1px solid ${theme.palette.divider}` } } }}
            >
              <MenuItem
                onClick={() => {
                  handleProfileMenuClose();
                  navigate('/settings');
                }}
              >
                <Person sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
                {tc('my_profile')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProfileMenuClose();
                  navigate('/settings');
                }}
              >
                <Settings sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
                {tc('settings')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleProfileMenuClose();
                  logout();
                }}
                sx={{ color: 'error.main' }}
              >
                <Logout sx={{ mr: 1.5, fontSize: 18 }} />
                {tc('logout')}
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
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
