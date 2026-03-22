import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useThemeStore } from './useThemeStore'

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store state and localStorage
    useThemeStore.setState({ isDarkMode: false })
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('should initialize with correct default state', () => {
    const state = useThemeStore.getState()
    expect(state.isDarkMode).toBe(false)
  })

  it('should toggle theme', () => {
    const store = useThemeStore.getState()

    expect(store.isDarkMode).toBe(false)
    store.toggleTheme()

    expect(useThemeStore.getState().isDarkMode).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('mindnotes-theme')).toBe('dark')
  })

  it('should set dark mode', () => {
    const store = useThemeStore.getState()

    store.setDarkMode(true)
    expect(useThemeStore.getState().isDarkMode).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('mindnotes-theme')).toBe('dark')

    store.setDarkMode(false)
    expect(useThemeStore.getState().isDarkMode).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('mindnotes-theme')).toBe('light')
  })

  it('should persist theme to localStorage', () => {
    const store = useThemeStore.getState()

    store.toggleTheme()
    expect(localStorage.getItem('mindnotes-theme')).toBe('dark')

    store.toggleTheme()
    expect(localStorage.getItem('mindnotes-theme')).toBe('light')
  })

  it('should restore theme from localStorage on init', () => {
    localStorage.setItem('mindnotes-theme', 'dark')

    useThemeStore.getState().initTheme()

    expect(useThemeStore.getState().isDarkMode).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should respect system preference if no localStorage', () => {
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMedia,
    })

    useThemeStore.getState().initTheme()

    // Since system prefers dark and no localStorage is set
    expect(useThemeStore.getState().isDarkMode).toBe(true)
  })

  it('should apply dark class to document', () => {
    document.documentElement.classList.remove('dark')

    const store = useThemeStore.getState()
    store.setDarkMode(true)

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    store.setDarkMode(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should toggle theme multiple times', () => {
    const store = useThemeStore.getState()

    store.toggleTheme()
    expect(useThemeStore.getState().isDarkMode).toBe(true)

    store.toggleTheme()
    expect(useThemeStore.getState().isDarkMode).toBe(false)

    store.toggleTheme()
    expect(useThemeStore.getState().isDarkMode).toBe(true)
  })
})
