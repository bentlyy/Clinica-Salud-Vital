import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AppThemeProvider, useThemeMode } from '@/shared/providers/ThemeProvider';

function ThemeConsumer() {
  const { mode, toggleTheme } = useThemeMode();
  return <button onClick={toggleTheme}>{mode}</button>;
}

function renderWithTheme() {
  return render(
    <AppThemeProvider>
      <ThemeConsumer />
    </AppThemeProvider>,
  );
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('AppThemeProvider', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockMatchMedia(false);
  });

  it('defaults to light mode', () => {
    localStorage.removeItem('theme_mode');
    renderWithTheme();
    expect(screen.getByRole('button').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles to dark mode and persists the choice', () => {
    localStorage.removeItem('theme_mode');
    renderWithTheme();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('dark');
    expect(localStorage.getItem('theme_mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles back to light mode', () => {
    localStorage.removeItem('theme_mode');
    renderWithTheme();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('light');
    expect(localStorage.getItem('theme_mode')).toBe('light');
  });

  it('reads the initial mode from localStorage', () => {
    localStorage.setItem('theme_mode', 'dark');
    renderWithTheme();
    expect(screen.getByRole('button').textContent).toBe('dark');
  });

  it('uses the system color scheme when nothing is stored', () => {
    localStorage.removeItem('theme_mode');
    mockMatchMedia(true);
    renderWithTheme();
    expect(screen.getByRole('button').textContent).toBe('dark');
  });

  it('renders children', () => {
    render(
      <AppThemeProvider>
        <div>Child content</div>
      </AppThemeProvider>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('throws when useThemeMode is used outside the provider', () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      'useThemeMode must be used within AppThemeProvider',
    );
  });
});
