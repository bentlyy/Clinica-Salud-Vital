import React from 'react';
import '@testing-library/jest-dom';

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
  const t = (key: string, fallback?: string) => fallback ?? key;
  return {
    useTranslation: () => ({
      t,
      i18n: { changeLanguage: vi.fn() },
    }),
    withTranslation: () => (Component: React.ComponentType<{ t: typeof t }>) =>
      (props: Record<string, unknown>) => React.createElement(Component, { ...props, t }),
  };
});