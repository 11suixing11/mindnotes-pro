import { useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { useViewStore } from '../store/useViewStore'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '../store/useThemeStore'
import type { DrawState } from './canvas/useCanvasRenderer'
import { useTextEditor } from './canvas/useTextEditor'
import { useKeyboardBindings } from './canvas/useKeyboardBindings'
import { useSelectionEngine } from './canvas/useSelectionEngine'
import { useCanvasRenderer } from './canvas/useCanvasRenderer'
import { usePointerEngine } from './canvas/usePointerEngine'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const getDrawStateRef = useRef<() => DrawState>(() => ({
    drawing: false, currentPts: [], currentShape: null, mousePos: null,
    marquee: null, snapLines: { x: [], y: [] }, tool: 'pen', color: '#000', size: 4, brush: 'pen',
  }))

  // a) useTextEditor
  const { editingText, setEditingText, textRef, commitTextEdit, startEditText } = useTextEditor(canvasRef)

  // d) useCanvasRenderer (needs getDrawStateRef before pointer engine)
  const { scheduleRedraw, cachedBounds, canvasSize, dpr } = useCanvasRenderer(
    canvasRef,
    containerRef,
    () => getDrawStateRef.current(),
  )

  // c) useSelectionEngine
  const { findSnaps, snapLinesRef } = useSelectionEngine(cachedBounds)

  // e) usePointerEngine
  const { getCursor, copySelectedToSystemClipboard, getDrawState } = usePointerEngine({
    canvasRef,
    cachedBounds,
    scheduleRedraw,
    startEditText,
    textRef,
    findSnaps,
    snapLinesRef,
  })

  // Provide getDrawState to renderer via ref
  getDrawStateRef.current = getDrawState

  // b) useKeyboardBindings
  useKeyboardBindings({ copySelectedToSystemClipboard })

  const { isDarkMode } = useThemeStore()
  const { bgColor } = useAppStore(useShallow((s) => ({ bgColor: s.bgColor })))
  const { viewBox } = useViewStore(useShallow((s) => ({ viewBox: s.viewBox })))

  return (
    <>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} width={canvasSize.w * dpr} height={canvasSize.h * dpr} role="img" aria-label="°×°å»­²¼" className="w-full h-full touch-none" style={{ touchAction: 'none', cursor: getCursor(), backgroundColor: bgColor, width: '100%', height: '100%' }} />
      {editingText && (() => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return null
        const screenX = (editingText.x - viewBox.x) * viewBox.zoom + rect.left
        const screenY = (editingText.y - viewBox.y) * viewBox.zoom + rect.top
        return (
          <textarea ref={textRef} autoFocus value={editingText.content} onChange={(e) => setEditingText({ ...editingText, content: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTextEdit(editingText.content) }; if (e.key === 'Escape') setEditingText(null) }}
            onBlur={() => commitTextEdit(editingText.content)}
            style={{
              position: 'fixed', left: screenX - 2, top: screenY,
              minWidth: 40, maxWidth: 800, minHeight: editingText.fontSize * 1.6,
              padding: 0,
              fontSize: editingText.fontSize,
              lineHeight: 1.6,
              color: editingText.color,
              background: 'transparent',
              border: 'none',
              borderLeft: `2px solid ${isDarkMode ? 'rgba(200,160,176,0.6)' : 'rgba(176,125,110,0.6)'}`,
              outline: 'none', zIndex: 100,
              boxShadow: 'none',
              fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
              resize: 'none',
              overflow: 'hidden',
              caretColor: editingText.color,
              transform: `scale(${viewBox.zoom})`,
              transformOrigin: 'top left',
            }} />
        )
      })()}
      </div>
    </>
  )
}