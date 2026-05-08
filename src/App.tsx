import { useEffect, useState, useCallback, useRef } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import DocPanel from './components/DocPanel'
import { useDrawingStore } from './store/useDrawingStore'
import { useDocStore } from './store/useDocStore'
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
  const canvasBg = useDrawingStore((s) => s.canvasBg)
  const docInit = useDocStore((s) => s.init)
  const docs = useDocStore((s) => s.docs)
  const docLoaded = useDocStore((s) => s.loaded)
  const saveCurrent = useDocStore((s) => s.saveCurrent)
  const currentId = useDocStore((s) => s.currentId)
  const [showDocs, setShowDocs] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { initTheme(); docInit() }, [initTheme, docInit])

  const autoSave = useCallback(() => {
    if (!docLoaded || !currentId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveCurrent(strokes, shapes, canvasBg)
    }, 2000)
  }, [docLoaded, currentId, strokes, shapes, canvasBg, saveCurrent])

  useEffect(() => { autoSave() }, [strokes, shapes, canvasBg, autoSave])

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ background: canvasBg }}>
      <Canvas />
      <Toolbar onToggleDocs={() => setShowDocs(!showDocs)} />
      <DocPanel open={showDocs} onClose={() => setShowDocs(false)} />

      <div className="status panel">
        <span className="dot" />
        <span>IndexedDB</span>
        <span className="vl" />
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{TOOL_NAMES[tool] ?? tool}</span>
        <span className="vl" />
        <span>{strokes.length + shapes.length} 对象</span>
        <span className="vl" />
        <span style={{ color: 'var(--text-4)' }}>{docs.length} 画布</span>
      </div>

      <div className="hints panel">
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · 滚轮缩放 · <kbd>0</kbd>-<kbd>8</kbd> 工具
      </div>
    </div>
  )
}
