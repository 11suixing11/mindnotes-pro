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
    <div className="w-full h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg, #fff)' }}>
      <Canvas />
      <Toolbar />
      <div className="fixed bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 shadow-lg border border-gray-200 dark:border-gray-700 pointer-events-none">
        <div className="font-medium mb-1">快捷键</div>
        <div className="space-y-0.5 text-xs">
          <div>1-5 切换工具 | Delete 清空 | 滚轮缩放</div>
          <div>📷 导出PNG | 💾 保存JSON | 📂 导入JSON</div>
        </div>
      </div>
    </div>
  )
}
