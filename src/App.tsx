import { useEffect, useState, useCallback, useRef } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import DocPanel from './components/DocPanel'
import KBContent from './components/KBContent'
import { useDrawingStore } from './store/useDrawingStore'
import { useDocStore } from './store/useDocStore'
import { useKBStore } from './store/useKBStore'
import { useThemeStore } from './store/useThemeStore'

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
  const kbInit = useKBStore((s) => s.init)
  const kbLoaded = useKBStore((s) => s.loaded)
  const [showDocs, setShowDocs] = useState(false)
  const [view, setView] = useState<'canvas' | 'doc'>('canvas')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { initTheme(); docInit(); kbInit() }, [initTheme, docInit, kbInit])

  const autoSave = useCallback(() => {
    if (!docLoaded || !currentId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { saveCurrent(strokes, shapes, canvasBg) }, 2000)
  }, [docLoaded, currentId, strokes, shapes, canvasBg, saveCurrent])

  useEffect(() => { autoSave() }, [strokes, shapes, canvasBg, autoSave])

  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ background: canvasBg }}>
      <Canvas />
      <Toolbar onToggleDocs={() => setShowDocs(!showDocs)} />
      <DocPanel open={showDocs} onClose={() => setShowDocs(false)} />

      {view === 'doc' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'var(--card-solid)', display: 'flex' }}>
          <KBContent />
          <button onClick={() => setView('canvas')} style={{ position: 'absolute', top: 12, right: 12, zIndex: 31, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← 返回画板</button>
        </div>
      )}

      <div className="status panel">
        <span className="dot" />
        <span onClick={() => setView('doc')} style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>知识库</span>
        <span className="vl" />
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{tool}</span>
        <span className="vl" />
        <span>{strokes.length + shapes.length} 对象</span>
      </div>

      <div className="hints panel">
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · 滚轮缩放 · <kbd>0</kbd>-<kbd>8</kbd> 工具
      </div>
    </div>
  )
}
