import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import { plusJakarta } from '@/app/config/fonts';

type ThemeMode = 'light' | 'dark';

interface ThemeModeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType | null>(null);

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem('theme_mode');
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function buildTheme(mode: ThemeMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#0d9488',
        light: '#2dd4bf',
        dark: '#0f766e',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
      },
      error: {
        main: '#ef4444',
        light: '#fca5a5',
        dark: '#dc2626',
      },
      warning: {
        main: '#f59e0b',
        light: '#fcd34d',
        dark: '#d97706',
      },
      info: {
        main: '#3b82f6',
        light: '#93c5fd',
        dark: '#2563eb',
      },
      success: {
        main: '#10b981',
        light: '#6ee7b7',
        dark: '#059669',
      },
      background: isDark
        ? { default: '#111827', paper: '#1f2937' }
        : { default: '#f9fafb', paper: '#ffffff' },
      text: isDark
        ? { primary: '#f3f4f6', secondary: '#9ca3af' }
        : { primary: '#1f2937', secondary: '#6b7280' },
      divider: isDark ? '#374151' : '#e5e7eb',
      custom: {
        status: {
          success: {
            bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
            text: isDark ? '#6ee7b7' : '#059669',
            border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
            darkBg: '#ecfdf5',
          },
          error: {
            bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
            text: isDark ? '#fca5a5' : '#dc2626',
            border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
            darkBg: '#fef2f2',
          },
          warning: {
            bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
            text: isDark ? '#fcd34d' : '#d97706',
            border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
            darkBg: '#fffbeb',
          },
          info: {
            bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
            text: isDark ? '#93c5fd' : '#2563eb',
            border: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
            darkBg: '#eff6ff',
          },
        },
        brand: {
          lightest: isDark ? 'rgba(13, 148, 136, 0.08)' : '#f0fdfa',
          lighter: isDark ? 'rgba(13, 148, 136, 0.12)' : '#ccfbf1',
          light: '#2dd4bf',
          main: '#0d9488',
          dark: '#0f766e',
          darker: '#115e59',
          alpha8: isDark ? 'rgba(13, 148, 136, 0.08)' : 'rgba(13, 148, 136, 0.05)',
          alpha12: isDark ? 'rgba(13, 148, 136, 0.12)' : 'rgba(13, 148, 136, 0.08)',
        },
        surface: {
          raised: isDark ? '#374151' : '#ffffff',
          sunken: isDark ? '#111827' : '#f3f4f6',
          muted: isDark ? '#1f2937' : '#f9fafb',
        },
      },
    },
    typography: {
      fontFamily: plusJakarta,
      h1: { fontWeight: 800, letterSpacing: '-0.025em', fontSize: '2rem' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.5rem' },
      h3: { fontWeight: 700, letterSpacing: '-0.015em', fontSize: '1.25rem' },
      h4: { fontWeight: 600, letterSpacing: '-0.01em', fontSize: '1.125rem' },
      h5: { fontWeight: 600, fontSize: '1rem' },
      h6: { fontWeight: 600, fontSize: '0.875rem' },
      body1: { fontWeight: 400, lineHeight: 1.6, fontSize: '0.875rem' },
      body2: { fontWeight: 400, lineHeight: 1.5, fontSize: '0.8125rem' },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
      caption: { fontWeight: 500, fontSize: '0.75rem' },
      overline: { fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.08em' },
    },
    shape: {
      borderRadius: 10,
    },
    shadows: [
      'none',
      '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      ...Array(14).fill('0 25px 50px -12px rgba(0, 0, 0, 0.25)'),
    ] as ReturnType<typeof createTheme>['shadows'],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#4b5563 transparent' : '#d1d5db transparent',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            },
          },
          outlined: {
            borderColor: isDark ? '#4b5563' : '#e5e7eb',
            color: isDark ? '#d1d5db' : '#374151',
            '&:hover': {
              borderColor: '#0d9488',
              backgroundColor: isDark ? '#0d948820' : '#f0fdfa',
              color: '#0d9488',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: 14 },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              fontSize: '0.875rem',
              '& fieldset': { borderColor: isDark ? '#4b5563' : '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#9ca3af' },
              '&.Mui-focused fieldset': { borderColor: '#0d9488', borderWidth: 2 },
            },
            '& .MuiInputLabel-root': { fontSize: '0.875rem' },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            padding: '12px 16px',
            borderBottom: `1px solid ${isDark ? '#374151' : '#f3f4f6'}`,
          },
          head: {
            fontWeight: 600,
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: isDark ? '#1f2937' : '#f9fafb',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            fontSize: '0.75rem',
            borderRadius: 8,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: '2px 8px',
            padding: '10px 12px',
            '&.Mui-selected': {
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
              '& .MuiListItemIcon-root': { color: '#0d9488' },
              '&:hover': { backgroundColor: '#ccfbf1' },
            },
            '&:hover': {
              backgroundColor: isDark ? '#374151' : '#f9fafb',
            },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: '0.875rem',
          },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme_mode', next);
      return next;
    });
  };

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const contextValue = useMemo(() => ({ mode, toggleTheme }), [mode]);

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextType {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within AppThemeProvider');
  return ctx;
}
