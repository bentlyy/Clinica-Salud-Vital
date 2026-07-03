import { render, screen, Suspense } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('../../context/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('../../context/useFeature', () => ({
  useFeature: () => ({ hasFeature: () => true, loading: false }),
}));
vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({ t: (k) => k, locale: 'es' }),
  setStoredLocale: vi.fn(),
}));

import AppLayout from '../../routes/AppLayout';

describe('AppLayout smoke', () => {
  it('renders children inside layout', () => {
    render(
      <MemoryRouter>
        <AppLayout><div>CONTENT</div></AppLayout>
      </MemoryRouter>
    );
    expect(screen.getByText('CONTENT')).toBeInTheDocument();
  });
});
