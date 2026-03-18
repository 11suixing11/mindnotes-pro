import { useState, useRef, useEffect } from 'react'
import Canvas, { CanvasRef } from './components/Canvas'
import Toolbar from './components/Toolbar'
import SaveDialog from './components/SaveDialog'
import { useThemeStore } from './store/useThemeStore'

function App() {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const canvasRef = useRef<CanvasRef>(null)
  const { initTheme } = useThemeStore()
  
  // 初始化主题
  useEffect(() => {
    initTheme()
  }, [initTheme])
  
  // 监听保存快捷键
  useEffect(() => {
    const handleSaveEvent = () => {
      setShowSaveDialog(true)
    }
    
    window.addEventListener('mindnotes-save', handleSaveEvent)
    return () => window.removeEventListener('mindnotes-save', handleSaveEvent)
  }, [])
  
  return (
    <div className="w-full h-screen relative bg-gray-50 overflow-hidden">
      {/* 顶部工具栏 */}
      <Toolbar />
      
      {/* 画布区域 */}
      <Canvas ref={canvasRef} />
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-4 right-4 flex gap-3 z-10">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="toolbar-btn bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
          title="保存笔记 (Ctrl+S)"
        >
          💾 保存
        </button>
      </div>
      
      {/* 保存对话框 */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        canvas={canvasRef.current?.getCanvas() || null}
      />
      
      {/* 使用说明 */}
      <div className="fixed bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 text-sm text-gray-600 shadow-lg border border-gray-200">
        <div className="font-medium mb-2">💡 使用提示</div>
        <div className="space-y-1">
          <div>🖱️ 鼠标按住绘写</div>
          <div>⌨️ Ctrl+Z 撤销</div>
          <div>💾 Ctrl+S 保存</div>
          <div>🗑️ Delete 清空</div>
        </div>
      </div>
      
      {/* 右上角状态指示器 */}
      <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-500 shadow-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>就绪</span>
        </div>
      </div>
    </div>
  )
}

export default App
