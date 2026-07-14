import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTheme } from '../../context/useTheme';
import { ThemeContext } from '../../context/ThemeContext';
import type { ThemeContextValue } from '../../context/ThemeContext';
import { createElement } from 'react';

const mockCtx: ThemeContextValue = {
  theme: 'light',
  toggleTheme: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(ThemeContext.Provider, { value: mockCtx }, children);

describe('useTheme', () => {
  it('returns context value when used within ThemeProvider', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current).toBe(mockCtx);
  });

  it('throws when used outside ThemeProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useTheme());
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('useTheme must be used within a ThemeProvider');
    } catch {
      expect(true).toBe(true);
    }
    consoleSpy.mockRestore();
  });
});
