import { useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { useDrawingStore } from './store/useDrawingStore'
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
  useEffect(() => { initTheme() }, [initTheme])

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>
      <Canvas />
      <Toolbar />

      {/* Bottom-left status */}
      <div className="fixed bottom-3 left-3 island status-bar">
        <span className="status-dot" />
        <span>本地</span>
        <span className="sep" />
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_NAMES[tool] ?? tool}</span>
        <span className="sep" />
        <span>{strokes.length + shapes.length} 对象</span>
      </div>

      {/* Bottom-right hint */}
      <div className="fixed bottom-3 right-3 island hint-bar">
        Ctrl+Z 撤销 · 滚轮缩放 · 0-8 切换工具
      </div>
    </div>
  )
}
