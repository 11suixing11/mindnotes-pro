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
    <div className="w-full h-screen relative overflow-hidden" style={{ background: 'var(--canvas)' }}>
      <Canvas />
      <Toolbar />

      <div className="fixed bottom-4 left-4 card info-bar">
        <span className="info-dot" />
        <span>本地存储</span>
        <span className="vl" />
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_NAMES[tool] ?? tool}</span>
        <span className="vl" />
        <span>{strokes.length + shapes.length} 个对象</span>
      </div>

      <div className="fixed bottom-4 right-4 card kb-hint">
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · 滚轮缩放 · <kbd>0</kbd>-<kbd>8</kbd> 切换工具
      </div>
    </div>
  )
}
