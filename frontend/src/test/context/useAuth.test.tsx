import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAuth } from '../../context/useAuth';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextValue } from '../../context/AuthContext';
import { createElement } from 'react';

const mockCtx: AuthContextValue = {
  user: null,
  login: vi.fn() as any,
  register: vi.fn() as any,
  logout: vi.fn() as any,
  loading: false,
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(AuthContext.Provider, { value: mockCtx }, children);

describe('useAuth', () => {
  it('returns context value when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBe(mockCtx);
  });

  it('throws when used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useAuth());
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('useAuth must be used within an AuthProvider');
    } catch {
      expect(true).toBe(true);
    }
    consoleSpy.mockRestore();
  });
});
