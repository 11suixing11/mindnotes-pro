import { useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { useThemeStore } from './store/useThemeStore'

export default function App() {
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[var(--bg-secondary)]">
      <Toolbar />
      <Canvas />
      <div className="fixed bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="font-medium mb-2">💡 使用提示</div>
        <div className="space-y-1">
          <div>🖱️ 鼠标按住绘写</div>
          <div>🧹 橡皮擦除</div>
          <div>✋ 平移画布</div>
        </div>
      </div>
    </div>
  )
}
