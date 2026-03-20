import { lazy, Suspense, useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import '@tldraw/tldraw/tldraw.css'

// 懒加载 tldraw - 减少首屏加载体积 1.7MB
const Tldraw = lazy(() => import('@tldraw/tldraw').then(module => ({
  default: module.Tldraw
})))

interface MindNotesTldrawProps {
  onReady?: () => void
}

function LoadingState() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">加载编辑器中...</p>
      </div>
    </div>
  )
}

export default function MindNotesTldraw({ onReady }: MindNotesTldrawProps) {
  const { isDarkMode } = useThemeStore()

  useEffect(() => {
    // 应用深色模式
    const container = document.querySelector('.tl-container')
    if (container) {
      if (isDarkMode) {
        container.setAttribute('data-theme', 'dark')
      } else {
        container.removeAttribute('data-theme')
      }
    }
  }, [isDarkMode])

  const handleMount = (editor: any) => {
    // 中文本地化
    editor.updateUserPreferences({
      language: 'zh-Hans',
    })
    onReady?.()
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <div className="w-full h-screen">
        <Tldraw persistenceKey="mindnotes-pro" onMount={handleMount} />
      </div>
    </Suspense>
  )
}
