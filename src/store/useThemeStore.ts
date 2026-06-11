import { create } from 'zustand'
import { useAppStore } from './appStore'

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

let themeMediaQuery: MediaQueryList | null = null
let themeMediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null

function cleanupSystemThemeListener() {
  if (themeMediaQuery && themeMediaQueryHandler) {
    themeMediaQuery.removeEventListener('change', themeMediaQueryHandler)
  }
  themeMediaQuery = null
  themeMediaQueryHandler = null
}

const DARK_MODE_COLOR = '#e2dce6'
const LIGHT_MODE_COLOR = '#2c2416'

function isColorDark(hex: string): boolean {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function adaptStrokeColor(toDark: boolean) {
  const app = useAppStore.getState()
  if (toDark && isColorDark(app.color)) {
    app.setColor(DARK_MODE_COLOR)
  } else if (!toDark && !isColorDark(app.color)) {
    app.setColor(LIGHT_MODE_COLOR)
  }
}

interface ThemeState {
  // 主题状态
  isDarkMode: boolean

  // 主题切换方法
  toggleTheme: () => void
  setDarkMode: (isDark: boolean) => void

  // 初始化主题
  initTheme: () => void
  cleanupThemeListener: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // 初始状态
  isDarkMode: false,

  // 切换主题
  toggleTheme: () => {
    const newMode = !get().isDarkMode
    set({ isDarkMode: newMode })

    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    localStorage.setItem('mindnotes-theme', newMode ? 'dark' : 'light')

    const app = useAppStore.getState()
    const cur = app.bgColor
    const isLight = cur === '#ffffff' || cur === '#FFFFFF' || cur === '#fff' || cur === '#FFF'
    const isDark = cur === '#1A1820' || cur === '#1a1820'
    if (newMode && isLight) app.setBgColor('#1A1820')
    else if (!newMode && isDark) app.setBgColor('#ffffff')

    adaptStrokeColor(newMode)
  },

  // 设置主题
  setDarkMode: (isDark: boolean) => {
    set({ isDarkMode: isDark })

    // 应用到 document
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // 存储偏好
    localStorage.setItem('mindnotes-theme', isDark ? 'dark' : 'light')

    adaptStrokeColor(isDark)
  },

  // 初始化主题
  initTheme: () => {
    // 防止 HMR 或重复初始化导致监听器叠加
    cleanupSystemThemeListener()

    // 1. 检查 localStorage
    const savedTheme = localStorage.getItem('mindnotes-theme')

    if (savedTheme) {
      const isDark = savedTheme === 'dark'
      set({ isDarkMode: isDark })

      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      adaptStrokeColor(isDark)
      return
    }

    // 2. 检查系统偏好
    themeMediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
    const prefersDark = themeMediaQuery.matches

    if (prefersDark) {
      set({ isDarkMode: true })
      document.documentElement.classList.add('dark')
      adaptStrokeColor(true)
    }

    // 3. 监听系统主题变化
    themeMediaQueryHandler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('mindnotes-theme')) {
        const isDark = e.matches
        set({ isDarkMode: isDark })

        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        adaptStrokeColor(isDark)
      }
    }

    themeMediaQuery.addEventListener('change', themeMediaQueryHandler)
  },

  cleanupThemeListener: () => {
    cleanupSystemThemeListener()
  },
}))

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupSystemThemeListener()
  })
}
