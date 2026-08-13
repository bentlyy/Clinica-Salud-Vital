import React from 'react';
import '@testing-library/jest-dom';

// ResizeObserver is required by recharts (ResponsiveContainer) but missing in jsdom.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  // configurable:false so vitest's environment teardown (which deletes populated
  // globals between files in a reused fork) cannot remove it under parallel load.
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: false,
    enumerable: true,
  });
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const localStorageStore = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => (localStorageStore.has(key) ? localStorageStore.get(key) : null)),
  setItem: vi.fn((key: string, value: string) => { localStorageStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { localStorageStore.delete(key); }),
  clear: vi.fn(() => { localStorageStore.clear(); }),
};
global.localStorage = localStorageMock;

const sessionStorageStore = new Map<string, string>();
const sessionStorageMock = {
  getItem: vi.fn((key: string) => (sessionStorageStore.has(key) ? sessionStorageStore.get(key) : null)),
  setItem: vi.fn((key: string, value: string) => { sessionStorageStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { sessionStorageStore.delete(key); }),
  clear: vi.fn(() => { sessionStorageStore.clear(); }),
};
global.sessionStorage = sessionStorageMock;

vi.mock('react-i18next', () => {
  const t = (
    key: string,
    fallback?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => {
    let base: string;
    let opts: Record<string, unknown> | undefined;
    if (typeof fallback === 'string') {
      base = fallback;
      opts = options;
    } else if (fallback && typeof fallback === 'object') {
      base = key;
      opts = fallback;
    } else {
      base = key;
      opts = undefined;
    }
    if (!opts) return base;
    return base.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts![name] ?? `{{${name}}}`));
  };
  return {
    useTranslation: () => ({
      t,
      i18n: { changeLanguage: vi.fn() },
    }),
    withTranslation: () => (Component: React.ComponentType<{ t: typeof t }>) =>
      (props: Record<string, unknown>) => React.createElement(Component, { ...props, t }),
    initReactI18next: {
      type: '3rdParty',
      init: () => undefined,
    },
  };
});