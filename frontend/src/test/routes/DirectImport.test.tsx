import { render, screen, Suspense } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../context/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('../../context/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../../context/useFeature', () => ({ useFeature: () => ({ hasFeature: () => true, loading: false }) }));
vi.mock('../../i18n/useI18n', () => ({ useI18n: () => ({ t: (k) => k, locale: 'es' }), setStoredLocale: vi.fn() }));
vi.mock('../../i18n/translations', () => ({ default: {} }));

import AppLayout from '../../routes/AppLayout';

vi.mock('../../pages/HomePage', () => ({ default: () => <div>NO_LAZY_HOME</div> }));
import HomePage from '../../pages/HomePage';

describe('Direct import (no lazy)', () => {
  it('renders directly imported component', () => {
    render(
      <MemoryRouter>
        <AppLayout><HomePage /></AppLayout>
      </MemoryRouter>
    );
    expect(screen.getByText('NO_LAZY_HOME')).toBeInTheDocument();
  });
});
