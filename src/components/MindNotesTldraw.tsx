import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useThemeStore } from '../store/useThemeStore'
import { useEffect } from 'react'

interface MindNotesTldrawProps {
  onReady?: () => void
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
    <div className="w-full h-screen">
      <Tldraw
        persistenceKey="mindnotes-pro"
        onMount={handleMount}
      />
    </div>
  )
}
