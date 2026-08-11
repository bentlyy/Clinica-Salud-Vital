import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WithFeature } from '@/shared/components/WithFeature';

const mockFeature = vi.hoisted(() => ({
  hasFeature: vi.fn(() => true),
  loading: false,
}));

vi.mock('@/shared/hooks/useFeature', () => ({
  useFeature: () => ({
    features: {},
    hasFeature: mockFeature.hasFeature,
    loading: mockFeature.loading,
    reload: vi.fn(),
  }),
}));

vi.mock('@/shared/components/ui/LoadingState', () => ({
  LoadingState: () => <div>LoadingState mock</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es' },
  }),
}));

function renderWithFeature() {
  return render(
    <MemoryRouter>
      <WithFeature featureKey="laboratory" featureName="Laboratorio">
        <div>Protected content</div>
      </WithFeature>
    </MemoryRouter>,
  );
}

describe('WithFeature', () => {
  beforeEach(() => {
    mockFeature.loading = false;
    mockFeature.hasFeature.mockReturnValue(true);
  });

  it('renders LoadingState while features are loading', () => {
    mockFeature.loading = true;
    renderWithFeature();
    expect(screen.getByText('LoadingState mock')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders PremiumLocked when the feature is not available', () => {
    mockFeature.hasFeature.mockReturnValue(false);
    renderWithFeature();
    expect(screen.getByText('Laboratorio')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when the feature is available', () => {
    renderWithFeature();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('calls hasFeature with the feature key', () => {
    renderWithFeature();
    expect(mockFeature.hasFeature).toHaveBeenCalledWith('laboratory');
  });
});
