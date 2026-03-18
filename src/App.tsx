import React, { useState, useRef } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import SaveDialog from './components/SaveDialog'

function App() {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  return (
    <div className="w-full h-screen relative bg-gray-50">
      {/* 顶部工具栏 */}
      <Toolbar />
      
      {/* 画布区域 */}
      <Canvas />
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-4 right-4 flex gap-3 z-10">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="toolbar-btn bg-primary text-white shadow-lg hover:bg-primary/90"
        >
          💾 保存
        </button>
      </div>
      
      {/* 保存对话框 */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        canvasRef={canvasRef}
      />
      
      {/* 使用说明 */}
      <div className="fixed bottom-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-gray-600 shadow-lg">
        <div>🖱️ 鼠标按住绘写</div>
        <div>⌨️ 支持压感（如有）</div>
      </div>
    </div>
  )
}

export default App
