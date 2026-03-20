import { create } from 'zustand'

interface ThemeState {
  isDarkMode: boolean
  toggleTheme: () => void
  setDarkMode: (isDark: boolean) => void
  initTheme: () => void
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('mindnotes-theme', isDark ? 'dark' : 'light')
}

let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,

  toggleTheme: () => {
    const newMode = !get().isDarkMode
    set({ isDarkMode: newMode })
    applyTheme(newMode)
  },

  setDarkMode: (isDark: boolean) => {
    set({ isDarkMode: isDark })
    applyTheme(isDark)
  },

  initTheme: () => {
    // 清理旧的监听器
    if (mediaQueryListener) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', mediaQueryListener)
      mediaQueryListener = null
    }

    const savedTheme = localStorage.getItem('mindnotes-theme')
    if (savedTheme) {
      const isDark = savedTheme === 'dark'
      set({ isDarkMode: isDark })
      applyTheme(isDark)
      return
    }

    // 系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      set({ isDarkMode: true })
      applyTheme(true)
    }

    // 监听系统主题变化（仅在用户未手动选择时）
    mediaQueryListener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('mindnotes-theme')) {
        const isDark = e.matches
        set({ isDarkMode: isDark })
        applyTheme(isDark)
      }
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', mediaQueryListener)
  },
}))
