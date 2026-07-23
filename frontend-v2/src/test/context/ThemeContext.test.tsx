import { renderHook, act } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeContext'
import { useTheme } from '@/context/useTheme'
import type { ReactNode } from 'react'

// Clean up localStorage and document attributes before each test
function cleanThemeStorage() {
  localStorage.removeItem('theme')
  document.documentElement.removeAttribute('data-theme')
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe('ThemeContext', () => {
  beforeEach(() => {
    cleanThemeStorage()
    vi.clearAllMocks()
  })

  it('defaults to light theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('sets data-theme attribute on the document element', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    act(() => {
      result.current.toggleTheme()
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles theme from light to dark and back', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('light')
  })

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.toggleTheme()
    })

    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('throws when used outside ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useTheme())).toThrow(
      /useTheme must be used within a ThemeProvider/,
    )

    consoleError.mockRestore()
  })
})
