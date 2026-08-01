import { useRef, useCallback, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { DEFAULT_GRID_SIZE, useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import { getTextLineHeight, type TextFormatState } from '../../canvas/textFormatting'
import { ContextMenu } from '../context-menu'
import type { DrawState } from './useCanvasRenderer'
import { useTextEditor } from './useTextEditor'
import { useKeyboardBindings } from './useKeyboardBindings'
import { useSelectionEngine } from './useSelectionEngine'
import { useCanvasRenderer } from './useCanvasRenderer'
import { usePointerEngine } from './usePointerEngine'
import TextFormatToolbar from './TextFormatToolbar'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textToolbarRef = useRef<HTMLDivElement | null>(null)
  // 右键上下文菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const getDrawStateRef = useRef<() => DrawState>(() => ({
    drawing: false,
    currentPts: [],
    currentPressures: [],
    currentShape: null,
    mousePos: null,
    rotationAngle: null,
    marquee: null,
    snapLines: { x: [], y: [] },
    tool: 'pen',
    color: '#000',
    size: 4,
    brush: 'pen',
    showGrid: false,
    showRulers: false,
    gridSize: DEFAULT_GRID_SIZE,
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
  const { getCursor, copySelectedToSystemClipboard, getDrawState, hoveredElementIdRef } =
    usePointerEngine({
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
  useKeyboardBindings({ copySelectedToSystemClipboard, hoveredElementIdRef })

  // 右键上下文菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

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

  const updateEditingTextFormat = useCallback(
    (patch: Partial<TextFormatState>) => {
      setEditingText((current) => {
        if (!current) return current
        const fontSize = patch.fontSize ?? current.fontSize
        const lineHeight = getTextLineHeight(fontSize)
        const lineCount = Math.max(1, current.content.split('\n').length)
        return {
          ...current,
          ...patch,
          fontSize,
          height: Math.max(current.height, lineHeight * lineCount),
        }
      })
    },
    [setEditingText]
  )

  const { isDarkMode } = useThemeStore()

  // P1-1/P1-2 性能优化: 移除不必要的订阅
  // - bgColor: 已由 drawCanvasBackground() 绘制，CSS 重复
  // - viewBox: 仅 text editor 需要，且仅在 editingText 非空时读取

  return (
    <>
      <div
        ref={containerRef}
        className="canvas-surface canvas-grid-bg"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={handleContextMenu}
      >
        <canvas
          id="main-canvas"
          ref={canvasRef}
          width={Math.round(canvasSize.w * dpr)}
          height={Math.round(canvasSize.h * dpr)}
          role="img"
          aria-label="绘图画布"
          tabIndex={0}
          className="main-canvas"
          style={{
            touchAction: 'none',
            cursor: getCursor(),
            width: '100%',
            height: '100%',
          }}
        />
        {editingText &&
          (() => {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return null
            // P1-1 性能优化: 仅在需要时读取 viewBox，避免订阅导致的频繁重渲染
            const viewBox = useViewStore.getState().viewBox
            const screenX = (editingText.x - viewBox.x) * viewBox.zoom + rect.left
            const screenY = (editingText.y - viewBox.y) * viewBox.zoom + rect.top
            const lineHeight = getTextLineHeight(editingText.fontSize)
            const lineCount = Math.max(1, editingText.content.split('\n').length)
            const editorHeight = Math.max(editingText.height, lineHeight * lineCount)
            const toolbarLeft = Math.max(8, Math.min(screenX - 2, window.innerWidth - 8))
            const toolbarTop = Math.max(8, screenY - 44)
            const alignToolbarRight = toolbarLeft > window.innerWidth - 360
            return (
              <>
                <TextFormatToolbar
                  editingText={editingText}
                  toolbarRef={textToolbarRef}
                  textAreaRef={textRef}
                  left={toolbarLeft}
                  top={toolbarTop}
                  alignRight={alignToolbarRight}
                  onChange={updateEditingTextFormat}
                  onBlurOutside={() => commitTextEdit(editingText.content)}
                />
                <textarea
                  ref={textRef}
                  autoFocus
                  value={editingText.content}
                  onChange={(e) => {
                    const content = e.target.value
                    const nextLineCount = Math.max(1, content.split('\n').length)
                    setEditingText({
                      ...editingText,
                      content,
                      height: Math.max(editingText.height, lineHeight * nextLineCount),
                    })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      commitTextEdit(editingText.content)
                    }
                    if (e.key === 'Escape') setEditingText(null)
                  }}
                  onBlur={(e) => {
                    const relatedTarget = e.relatedTarget as Node | null
                    if (relatedTarget && textToolbarRef.current?.contains(relatedTarget)) return
                    commitTextEdit(editingText.content)
                  }}
                  style={{
                    position: 'fixed',
                    left: screenX - 2,
                    top: screenY,
                    width: editingText.width,
                    maxWidth: 800,
                    height: editorHeight,
                    minHeight: lineHeight,
                    padding: '2px 4px',
                    boxSizing: 'border-box',
                    fontSize: editingText.fontSize,
                    fontWeight: editingText.fontWeight,
                    fontStyle: editingText.fontStyle,
                    textDecoration: editingText.textDecoration,
                    textAlign: editingText.textAlign,
                    lineHeight: 1.6,
                    color: editingText.color,
                    background: editingText.backgroundColor ?? 'transparent',
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
              </>
            )
          })()}
      </div>
      {/* 右键上下文菜单 */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={handleCloseContextMenu} />
      )}
    </>
  )
}
