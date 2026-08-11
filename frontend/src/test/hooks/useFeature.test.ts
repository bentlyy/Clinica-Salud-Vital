import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { useFeature } from '@/shared/hooks/useFeature';
import { FeatureContext } from '@/shared/providers/FeatureProvider';

describe('useFeature', () => {
  it('throws when used outside of a FeatureProvider', () => {
    expect(() => renderHook(() => useFeature())).toThrow(
      'useFeature must be used within a FeatureProvider',
    );
  });

  it('returns the FeatureContext value when used inside a provider', () => {
    const contextValue = {
      features: { laboratory: true },
      hasFeature: (key: string) => key === 'laboratory',
      loading: false,
      reload: async () => {},
    };
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(FeatureContext.Provider, { value: contextValue }, children);

    const { result } = renderHook(() => useFeature(), { wrapper });

    expect(result.current.hasFeature('laboratory')).toBe(true);
    expect(result.current.hasFeature('other')).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.features).toEqual({ laboratory: true });
  });
});
