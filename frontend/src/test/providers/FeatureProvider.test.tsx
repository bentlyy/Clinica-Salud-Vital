import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureProvider } from '@/shared/providers/FeatureProvider';
import { useFeature } from '@/shared/hooks/useFeature';

const mockGet = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockAuth.user }),
}));

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { get: mockGet },
}));

function Consumer() {
  const { features, hasFeature, loading, reload } = useFeature();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="features">{JSON.stringify(features)}</span>
      <span data-testid="has-laboratory">{String(hasFeature('laboratory'))}</span>
      <button data-testid="btn-reload" onClick={reload}>
        reload
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <FeatureProvider>
      <Consumer />
    </FeatureProvider>,
  );
}

describe('FeatureProvider', () => {
  beforeEach(() => {
    mockAuth.user = null;
    mockGet.mockReset();
  });

  it('does not fetch features and exposes empty state when there is no user', async () => {
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('features').textContent).toBe('{}');
    expect(screen.getByTestId('has-laboratory').textContent).toBe('false');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches features when a user is present', async () => {
    mockAuth.user = { id: 1, role: 'admin' };
    mockGet.mockResolvedValue({ data: { laboratory: true, analytics: false } });
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('features').textContent).toBe('{"laboratory":true,"analytics":false}');
    });
    expect(mockGet).toHaveBeenCalledWith('/saas/features');
    expect(screen.getByTestId('has-laboratory').textContent).toBe('true');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('exposes empty features when the fetch fails', async () => {
    mockAuth.user = { id: 1, role: 'admin' };
    mockGet.mockRejectedValue(new Error('network'));
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('features').textContent).toBe('{}');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('reloads features when reload is called', async () => {
    mockAuth.user = { id: 1, role: 'admin' };
    mockGet.mockResolvedValue({ data: { laboratory: true } });
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('has-laboratory').textContent).toBe('true');
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    mockGet.mockResolvedValue({ data: { laboratory: false } });
    screen.getByTestId('btn-reload').click();
    await waitFor(() => {
      expect(screen.getByTestId('has-laboratory').textContent).toBe('false');
    });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
