import { useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import { useAppStore } from './store/appStore'
import { useViewStore } from './store/useViewStore'
import { useThemeStore } from './store/useThemeStore'

const TOOL_LABELS: Record<string, string> = {
  select: '选择', pen: '画笔', eraser: '橡皮', pan: '平移', text: '文字',
  rectangle: '矩形', circle: '圆形', line: '直线', arrow: '箭头',
}

export default function App() {
  const { initTheme } = useThemeStore()
  const init = useAppStore((s) => s.init)
  const loaded = useAppStore((s) => s.loaded)
  const tool = useAppStore((s) => s.tool)
  const elements = useAppStore((s) => s.elements)
  const bgColor = useAppStore((s) => s.bgColor)
  const docs = useAppStore((s) => s.docs)
  const zoom = useViewStore((s) => s.viewBox.zoom)
  const zoomIn = useViewStore((s) => s.zoomIn)

  useEffect(() => { initTheme(); init() }, [initTheme, init])

  if (!loaded) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">M</div>
        <div className="loading-text">MindNotes</div>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', background: bgColor }}>
      <Sidebar />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Canvas />
        <Toolbar />

        <div className="status panel">
          <span className="dot" />
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_LABELS[tool] ?? tool}</span>
          <span className="vl" />
          <span>{elements.length} 元素</span>
          <span className="vl" />
          <span>{docs.length} 画布</span>
          <span className="vl" />
          <span style={{ cursor: 'pointer' }} onClick={zoomIn}>{Math.round(zoom * 100)}%</span>
        </div>

        <div className="hints panel">
          <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · 滚轮缩放 · <kbd>0</kbd>-<kbd>8</kbd> 工具 · <kbd>Del</kbd> 删除选中
        </div>
      </div>
    </div>
  )
}
