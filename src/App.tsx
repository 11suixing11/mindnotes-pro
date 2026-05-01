import { useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { useDrawingStore } from './store/useDrawingStore'
import { useViewStore } from './store/useViewStore'
import { useThemeStore } from './store/useThemeStore'

const TOOL_NAMES: Record<string, string> = {
  select: '选择', pen: '画笔', eraser: '橡皮', pan: '平移', text: '文字',
  rectangle: '矩形', circle: '圆形', line: '直线', arrow: '箭头',
}

export default function App() {
  const { initTheme } = useThemeStore()
  const tool = useDrawingStore((s) => s.tool)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const zoom = useViewStore((s) => s.viewBox.zoom)

  useEffect(() => { initTheme() }, [initTheme])

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg)' }}>
      <Canvas />
      <Toolbar />

      <div className="fixed bottom-3 left-3 glass-panel status-bar">
        <div className="status-item">
          <span className="status-dot" />
          <span>本地存储</span>
        </div>
        <div className="status-item">
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_NAMES[tool] ?? tool}</span>
        </div>
        <div className="status-item">
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <div className="status-item">
          <span>{strokes.length + shapes.length} 个对象</span>
        </div>
      </div>

      <div className="fixed bottom-3 right-3 glass-panel px-3 py-1.5 rounded-lg text-xs pointer-events-none" style={{ color: 'var(--text-secondary)' }}>
        Ctrl+Z 撤销 · 滚轮缩放 · 0-8 切换工具
      </div>
    </div>
  )
}
