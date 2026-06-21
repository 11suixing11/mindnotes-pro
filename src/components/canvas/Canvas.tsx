import { useRef, useCallback } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '../../store/useThemeStore'
import type { DrawState } from './useCanvasRenderer'
import { useTextEditor } from './useTextEditor'
import { useKeyboardBindings } from './useKeyboardBindings'
import { useSelectionEngine } from './useSelectionEngine'
import { useCanvasRenderer } from './useCanvasRenderer'
import { usePointerEngine } from './usePointerEngine'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const getDrawStateRef = useRef<() => DrawState>(() => ({
    drawing: false,
    currentPts: [],
    currentShape: null,
    mousePos: null,
    marquee: null,
    snapLines: { x: [], y: [] },
    tool: 'pen',
    color: '#000',
    size: 4,
    brush: 'pen',
    showGrid: false,
    showRulers: false,
    gridSize: 20,
    eraserTrail: [],
    penVelocity: 0,
  }))

  // a) useTextEditor
  const { editingText, setEditingText, textRef, commitTextEdit, startEditText } =
    useTextEditor(canvasRef)

  // d) useCanvasRenderer (needs getDrawStateRef before pointer engine)
  const { scheduleRedraw, cachedBounds, canvasSize, dpr } = useCanvasRenderer(
    canvasRef,
    containerRef,
    () => getDrawStateRef.current()
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

  // Drag-and-drop image support
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const vb = useViewStore.getState().viewBox

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const img = new Image()
        img.onload = () => {
          const maxDim = 500
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
          const w = Math.round(img.width * scale)
          const h = Math.round(img.height * scale)
          // Position at drop location in canvas coordinates
          const cx = (e.clientX - rect.left) / vb.zoom + vb.x
          const cy = (e.clientY - rect.top) / vb.zoom + vb.y
          useAppStore.getState().addElement({
            type: 'image',
            id: `img-${Date.now()}`,
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
            dataUrl,
          })
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const { isDarkMode } = useThemeStore()
  const { bgColor } = useAppStore(useShallow((s) => ({ bgColor: s.bgColor })))
  const { viewBox } = useViewStore(useShallow((s) => ({ viewBox: s.viewBox })))

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden canvas-grid-bg"
        style={{ zIndex: 10 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <canvas
          id="main-canvas"
          ref={canvasRef}
          width={canvasSize.w * dpr}
          height={canvasSize.h * dpr}
          role="img"
          aria-label="Drawing canvas - Use toolbar to select tools and draw"
          className="w-full h-full touch-none"
          style={{
            touchAction: 'none',
            cursor: getCursor(),
            backgroundColor: bgColor,
            width: '100%',
            height: '100%',
          }}
        />
        {editingText &&
          (() => {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return null
            const screenX = (editingText.x - viewBox.x) * viewBox.zoom + rect.left
            const screenY = (editingText.y - viewBox.y) * viewBox.zoom + rect.top
            return (
              <textarea
                ref={textRef}
                autoFocus
                value={editingText.content}
                onChange={(e) => setEditingText({ ...editingText, content: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    commitTextEdit(editingText.content)
                  }
                  if (e.key === 'Escape') setEditingText(null)
                }}
                onBlur={() => commitTextEdit(editingText.content)}
                style={{
                  position: 'fixed',
                  left: screenX - 2,
                  top: screenY,
                  minWidth: 40,
                  maxWidth: 800,
                  minHeight: editingText.fontSize * 1.6,
                  padding: 0,
                  fontSize: editingText.fontSize,
                  lineHeight: 1.6,
                  color: editingText.color,
                  background: 'transparent',
                  border: 'none',
                  borderLeft: `2px solid ${isDarkMode ? 'rgba(200,160,176,0.6)' : 'rgba(176,125,110,0.6)'}`,
                  outline: 'none',
                  zIndex: 100,
                  boxShadow: 'none',
                  fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
                  resize: 'none',
                  overflow: 'hidden',
                  caretColor: editingText.color,
                  transform: `scale(${viewBox.zoom})`,
                  transformOrigin: 'top left',
                }}
              />
            )
          })()}
      </div>
    </>
  )
}
