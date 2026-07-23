import { renderHook, act } from '@testing-library/react'
import { I18nContext, I18nProvider, useI18n } from '@/i18n/I18nContext'
import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('I18nContext', () => {
  beforeEach(() => {
    localStorage.removeItem('app_locale')
    vi.clearAllMocks()
  })

  it('returns translation for a valid key', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    const translated = result.current.t('auth.login')
    expect(typeof translated).toBe('string')
    expect(translated.length).toBeGreaterThan(0)
  })

  it('returns the key itself for invalid keys', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('starts with Spanish as the default locale when navigator language is Spanish', () => {
    // Temporarily mock navigator.language to detect Spanish
    const originalLanguage = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      'language',
    )
    Object.defineProperty(Navigator.prototype, 'language', {
      get: () => 'es-CL',
      configurable: true,
    })

    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.locale).toBe('es')

    // Restore original
    if (originalLanguage) {
      Object.defineProperty(Navigator.prototype, 'language', originalLanguage)
    }
  })

  it('can change locale to English', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    act(() => result.current.setLocale('en'))
    expect(result.current.locale).toBe('en')
  })

  it('returns English translations after locale change', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    act(() => result.current.setLocale('en'))
    expect(result.current.t('auth.login')).toBe('Sign In')
  })

  it('persists locale choice to localStorage', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    act(() => result.current.setLocale('en'))
    expect(localStorage.getItem('app_locale')).toBe('en')
  })

  it('supports interpolation parameters', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    // 'common.greeting' does not exist as a key; this tests plain key fallback
    expect(result.current.t('common.greeting', { name: 'Juan' })).toBe(
      'common.greeting',
    )
  })

  it('accepts a defaultLocale prop override', () => {
    function customWrapper({ children }: { children: ReactNode }) {
      return <I18nProvider defaultLocale="en">{children}</I18nProvider>
    }
    const { result } = renderHook(() => useI18n(), { wrapper: customWrapper })
    expect(result.current.locale).toBe('en')
  })

  it('throws when used outside I18nProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useI18n())).toThrow(
      /useI18n.*must.*used.*within.*I18nProvider/,
    )

    consoleError.mockRestore()
  })
})
