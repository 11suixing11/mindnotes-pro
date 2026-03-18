import { create } from 'zustand'

interface ThemeState {
  // 主题状态
  isDarkMode: boolean
  
  // 主题切换方法
  toggleTheme: () => void
  setDarkMode: (isDark: boolean) => void
  
  // 初始化主题
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // 初始状态
  isDarkMode: false,
  
  // 切换主题
  toggleTheme: () => {
    const newMode = !get().isDarkMode
    set({ isDarkMode: newMode })
    
    // 应用到 document
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // 存储偏好
    localStorage.setItem('mindnotes-theme', newMode ? 'dark' : 'light')
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
  },
  
  // 初始化主题
  initTheme: () => {
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
      return
    }
    
    // 2. 检查系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (prefersDark) {
      set({ isDarkMode: true })
      document.documentElement.classList.add('dark')
    }
    
    // 3. 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('mindnotes-theme')) {
        const isDark = e.matches
        set({ isDarkMode: isDark })
        
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    })
  }
}))
