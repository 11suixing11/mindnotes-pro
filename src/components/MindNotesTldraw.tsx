import { useEffect, useState } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import '@tldraw/tldraw/tldraw.css'

interface MindNotesTldrawProps {
  onReady?: () => void
  onError?: (error: Error) => void
}

export default function MindNotesTldraw({ onReady, onError }: MindNotesTldrawProps) {
  const [TldrawComponent, setTldrawComponent] = useState<any>(null)
  const { isDarkMode } = useThemeStore()

  // 动态导入 tldraw
  useEffect(() => {
    import('@tldraw/tldraw')
      .then(module => {
        setTldrawComponent(() => module.Tldraw)
      })
      .catch(error => {
        console.error('Failed to load tldraw:', error)
        onError?.(error instanceof Error ? error : new Error(String(error)))
      })
  }, [onError])

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
    try {
      editor.updateUserPreferences({
        language: 'zh-Hans',
      })
      onReady?.()
    } catch (error) {
      console.error('Failed to mount tldraw:', error)
      onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (!TldrawComponent) {
    return null // Suspense 会显示 fallback
  }

  return (
    <div className="w-full h-screen">
      <TldrawComponent persistenceKey="mindnotes-pro" onMount={handleMount} />
    </div>
  )
}
