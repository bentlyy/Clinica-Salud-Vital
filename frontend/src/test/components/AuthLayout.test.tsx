import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';

function renderAuthLayout(initialEntry = '/auth') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppThemeProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/auth" element={<div>Auth page content</div>} />
          </Route>
        </Routes>
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('AuthLayout', () => {
  it('renders the nested route content through the Outlet', () => {
    renderAuthLayout();
    expect(screen.getByText('Auth page content')).toBeInTheDocument();
  });

  it('renders a full-height flex container', () => {
    const { container } = renderAuthLayout();
    const box = container.querySelector('.MuiBox-root');
    expect(box).toBeInTheDocument();
    expect(box).toHaveStyle({ minHeight: '100vh' });
    expect(box).toHaveStyle({ display: 'flex' });
  });

  it('renders the outlet of a different nested route', () => {
    renderAuthLayout('/auth');
    expect(screen.getByText('Auth page content')).toBeInTheDocument();
  });
});
