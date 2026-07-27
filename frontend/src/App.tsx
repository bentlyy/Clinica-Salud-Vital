import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/app/config/theme.config';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
    </ThemeProvider>
  );
}
