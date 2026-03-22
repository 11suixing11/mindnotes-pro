import { useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import ConflictResolutionPanel from './components/ConflictResolutionPanel'
import { useThemeStore } from './store/useThemeStore'
import { syncEngine } from './utils/syncEngine'

export default function App() {
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  useEffect(() => {
    syncEngine.initialize().catch((error) => {
      console.error('同步引擎初始化失败:', error)
    })
  }, [])

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[var(--bg-secondary)]">
      <Toolbar />
      <Canvas />
      <ConflictResolutionPanel />
      <div className="fixed bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="font-medium mb-2">💡 使用提示</div>
        <div className="space-y-1">
          <div>🖱️ 鼠标按住绘写</div>
          <div>🧹 橡皮擦除</div>
          <div>✋ 平移画布</div>
        </div>
      </div>
      <div className="fixed top-4 right-4 z-10 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-300">
        离线优先已启用：断网可编辑，联网自动同步
      </div>
    </div>
  )
}
