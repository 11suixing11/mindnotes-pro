import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { sanitizeImageDataUrl } from '../../canvas/svgSanitizer'
import { useAppStore } from '../../store/appStore'
import { createRuntimeId } from '../../store/runtimeId'
import { DEFAULT_GRID_SIZE, useViewStore } from '../../store/useViewStore'
import { useToastStore } from '../../store/toastStore'
import { clientToWorld, worldToClient } from '../../canvas/coordinates'
import { getTextLineHeight, TEXT_FONT_FAMILY } from '../../canvas/textFormatting'
import type { TextElement } from '../../store/types'
import { ContextMenu } from '../context-menu'
import type { DrawState } from './useCanvasRenderer'
import { useTextEditor } from './useTextEditor'
import { useKeyboardBindings } from './useKeyboardBindings'
import { useSelectionEngine } from './useSelectionEngine'
import { useCanvasRenderer } from './useCanvasRenderer'
import { usePointerEngine } from './usePointerEngine'
import TextFormatToolbar from './TextFormatToolbar'
import { applyTextIndentation, getTextEditKeyAction } from './textEditorKeyboard'
import { getTextToolbarPosition } from './textToolbarPosition'
import { CanvasAccessibilityView } from './CanvasAccessibilityView'
import EmptyCanvasState from './EmptyCanvasState'
import {
  clearActiveTextRecoveryDraft,
  saveActiveTextRecoveryDraftNow,
} from '../../store/saveManager'

const TEXT_RECOVERY_CHECKPOINT_DELAY = 350
const TEXT_RECOVERY_CHECKPOINT_MAX_WAIT = 1250

export default function Canvas() {
  const toast = useToastStore((state) => state.show)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textToolbarRef = useRef<HTMLDivElement | null>(null)
  const editingTextRef = useRef<ReturnType<typeof useTextEditor>['editingText']>(null)
  const commitTextEditRef = useRef<ReturnType<typeof useTextEditor>['commitTextEdit']>(() => false)
  const textEditSessionRef = useRef(0)
  const textInteractionRef = useRef<'toolbar' | 'color-picker' | null>(null)
  const windowBlurredRef = useRef(false)
  const pendingCommitFramesRef = useRef(new Set<number>())
  const textRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textRecoveryDirtyRef = useRef(false)
  const textRecoveryFirstDirtyAtRef = useRef<number | null>(null)
  const [textEditSession, setTextEditSession] = useState(0)
  const [textToolbarMetrics, setTextToolbarMetrics] = useState({ width: 420, height: 56 })
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  }))
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
  const {
    editingText,
    textRef,
    updateEditingTextContent,
    updateEditingTextFormat,
    createTextRecoveryDraft,
    commitTextEdit,
    startEditText,
  } = useTextEditor(canvasRef)
  const editingTextId = editingText?.id
  editingTextRef.current = editingText
  commitTextEditRef.current = commitTextEdit

  useLayoutEffect(() => {
    useAppStore.getState().setActiveTextEditingId(editingTextId ?? null)
    return () => {
      if (useAppStore.getState().activeTextEditingId === editingTextId) {
        useAppStore.getState().setActiveTextEditingId(null)
      }
    }
  }, [editingTextId])

  const clearTextRecoveryTimer = useCallback(() => {
    if (textRecoveryTimerRef.current) {
      clearTimeout(textRecoveryTimerRef.current)
      textRecoveryTimerRef.current = null
    }
  }, [])

  const checkpointCurrentTextEdit = useCallback(() => {
    const current = editingTextRef.current
    if (!current) return false
    const content = textRef.current?.value ?? current.content
    const draft = createTextRecoveryDraft(content)
    return draft ? saveActiveTextRecoveryDraftNow(draft) : false
  }, [createTextRecoveryDraft, textRef])

  const flushTextRecoveryCheckpoint = useCallback(
    (force = false) => {
      if (!force && !textRecoveryDirtyRef.current) return false
      clearTextRecoveryTimer()
      const saved = checkpointCurrentTextEdit()
      if (saved) {
        textRecoveryDirtyRef.current = false
        textRecoveryFirstDirtyAtRef.current = null
      }
      return saved
    },
    [checkpointCurrentTextEdit, clearTextRecoveryTimer]
  )

  const scheduleTextRecoveryCheckpoint = useCallback(() => {
    const session = textEditSessionRef.current
    const now = Date.now()
    textRecoveryDirtyRef.current = true
    textRecoveryFirstDirtyAtRef.current ??= now
    clearTextRecoveryTimer()
    const maxWaitRemaining = Math.max(
      0,
      TEXT_RECOVERY_CHECKPOINT_MAX_WAIT - (now - textRecoveryFirstDirtyAtRef.current)
    )
    textRecoveryTimerRef.current = setTimeout(
      () => {
        textRecoveryTimerRef.current = null
        if (session !== textEditSessionRef.current) return
        const saved = checkpointCurrentTextEdit()
        if (saved) {
          textRecoveryDirtyRef.current = false
          textRecoveryFirstDirtyAtRef.current = null
        }
      },
      Math.min(TEXT_RECOVERY_CHECKPOINT_DELAY, maxWaitRemaining)
    )
  }, [checkpointCurrentTextEdit, clearTextRecoveryTimer])

  const commitCurrentTextEdit = useCallback(() => {
    const current = editingTextRef.current
    if (!current) return false
    // Read from the DOM first. React state can lag behind the final input
    // event when blur/keyboard submission happens in the same tick.
    const content = textRef.current?.value ?? current.content
    // Always checkpoint on exit, even if a previous timer already ran. The
    // DOM may contain a final IME/composition character that React has not
    // mirrored yet.
    flushTextRecoveryCheckpoint(true)
    const committed = commitTextEditRef.current(content, current.id)
    if (committed) {
      textRecoveryDirtyRef.current = false
      clearActiveTextRecoveryDraft()
      editingTextRef.current = null
    }
    return committed
  }, [flushTextRecoveryCheckpoint, textRef])

  const scheduleTextEditCommit = useCallback(
    (session: number, force = false) => {
      const frame = requestAnimationFrame(() => {
        pendingCommitFramesRef.current.delete(frame)
        if (session !== textEditSessionRef.current || windowBlurredRef.current) return
        if (!force) {
          if (textInteractionRef.current) return
          const activeElement = document.activeElement
          if (
            activeElement === textRef.current ||
            (activeElement && textToolbarRef.current?.contains(activeElement))
          ) {
            return
          }
        }
        if (!commitCurrentTextEdit()) textRef.current?.focus()
      })
      pendingCommitFramesRef.current.add(frame)
    },
    [commitCurrentTextEdit, textRef]
  )

  const beginTextEdit = useCallback(
    (...args: Parameters<typeof startEditText>) => {
      if (editingTextRef.current && !commitCurrentTextEdit()) return
      textInteractionRef.current = null
      const nextSession = textEditSessionRef.current + 1
      textEditSessionRef.current = nextSession
      setTextEditSession(nextSession)
      const existing = args[5]
      if (existing) {
        const latest = useAppStore.getState().idToElement.get(existing.id)
        if (latest?.type === 'text') {
          startEditText(args[0], args[1], args[2], args[3], args[4], latest)
          return
        }
      }
      startEditText(...args)
    },
    [commitCurrentTextEdit, startEditText]
  )

  // d) useCanvasRenderer (needs getDrawStateRef before pointer engine)
  const { scheduleRedraw, cachedBounds, canvasSize, dpr } = useCanvasRenderer(
    canvasRef,
    containerRef,
    () => getDrawStateRef.current(),
    editingTextId
  )
  // c) useSelectionEngine
  const { findSnaps, snapLinesRef } = useSelectionEngine(cachedBounds)
  // e) usePointerEngine
  const { getCursor, copySelectedToSystemClipboard, getDrawState, hoveredElementIdRef } =
    usePointerEngine({
      canvasRef,
      cachedBounds,
      scheduleRedraw,
      startEditText: beginTextEdit,
      textRef,
      findSnaps,
      snapLinesRef,
    })

  const editTextFromAccessibility = useCallback(
    (element: TextElement) => {
      const canvas = canvasRef.current
      const rect = canvas?.getBoundingClientRect()
      if (!rect) return
      const screen = worldToClient(
        { x: element.x, y: element.y },
        rect,
        useViewStore.getState().viewBox
      )
      beginTextEdit(element.x, element.y, screen.x, screen.y, element.color, element)
    },
    [beginTextEdit]
  )

  // Provide getDrawState to renderer via ref
  getDrawStateRef.current = getDrawState

  // b) useKeyboardBindings
  useKeyboardBindings({ copySelectedToSystemClipboard, hoveredElementIdRef })

  // 右键上下文菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (e.defaultPrevented) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Drag-and-drop image support
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
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
          const safeDataUrl = sanitizeImageDataUrl(dataUrl)
          if (!safeDataUrl) {
            toast('图片格式不受支持', 'error')
            return
          }
          const img = new Image()
          img.onload = () => {
            const maxDim = 500
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
            const w = Math.round(img.width * scale)
            const h = Math.round(img.height * scale)
            // Position at drop location in canvas coordinates
            const dropPoint = clientToWorld({ x: e.clientX, y: e.clientY }, rect, vb)
            const cx = dropPoint.x
            const cy = dropPoint.y
            useAppStore.getState().addElement({
              type: 'image',
              id: createRuntimeId('img'),
              x: cx - w / 2,
              y: cy - h / 2,
              width: w,
              height: h,
              dataUrl: safeDataUrl,
            })
          }
          img.onerror = () => toast('图片加载失败', 'error')
          img.src = safeDataUrl
        }
        reader.onerror = () => toast('图片读取失败，请重试', 'error')
        reader.readAsDataURL(file)
      }
    },
    [toast]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  useAppStore((state) => state.tool)
  useAppStore((state) => state.styleEyedropperActive)
  useViewStore((state) => state.isPanning)
  const editingViewBox = useViewStore((state) => (editingText ? state.viewBox : null))

  useLayoutEffect(() => {
    if (!editingTextId) return

    const toolbar = textToolbarRef.current
    if (!toolbar) return

    const measure = () => {
      const { width, height } = toolbar.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      setTextToolbarMetrics((current) =>
        current.width === width && current.height === height ? current : { width, height }
      )
    }

    const syncViewport = () => {
      setViewportSize((current) => {
        const next = { width: window.innerWidth, height: window.innerHeight }
        return current.width === next.width && current.height === next.height ? current : next
      })
      measure()
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure())
    observer?.observe(toolbar)

    return () => {
      window.removeEventListener('resize', syncViewport)
      observer?.disconnect()
    }
  }, [editingTextId])

  useEffect(() => {
    if (!editingTextId) return

    const handleWindowBlur = () => {
      windowBlurredRef.current = true
    }
    const handleWindowFocus = () => {
      windowBlurredRef.current = false
      textInteractionRef.current = null
    }
    const handleExit = () => {
      // Capture runs before the app lifecycle exit handler so the journal and
      // IndexedDB save both see the textarea's final DOM value.
      commitCurrentTextEdit()
    }

    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('beforeunload', handleExit, true)
    window.addEventListener('pagehide', handleExit, true)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('beforeunload', handleExit, true)
      window.removeEventListener('pagehide', handleExit, true)
    }
  }, [commitCurrentTextEdit, editingTextId, textRef])

  useEffect(() => {
    if (!editingTextId) return
    const session = textEditSession
    const pendingCommitFrames = pendingCommitFramesRef.current
    const frame = requestAnimationFrame(() => {
      pendingCommitFrames.delete(frame)
      if (session === textEditSessionRef.current) textRef.current?.focus()
    })
    pendingCommitFrames.add(frame)
    return () => {
      pendingCommitFrames.delete(frame)
      cancelAnimationFrame(frame)
    }
  }, [editingTextId, textEditSession, textRef])

  useEffect(() => {
    const pendingCommitFrames = pendingCommitFramesRef.current
    return () => {
      for (const frame of pendingCommitFrames) cancelAnimationFrame(frame)
      pendingCommitFrames.clear()
      clearTextRecoveryTimer()
    }
  }, [clearTextRecoveryTimer])

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
          role="region"
          aria-label="交互式绘图画布"
          aria-describedby="canvas-keyboard-instructions canvas-accessibility-status"
          tabIndex={0}
          className="main-canvas"
          onPointerDownCapture={(event) => {
            if (!editingTextRef.current || commitCurrentTextEdit()) return
            event.preventDefault()
            event.stopPropagation()
            textRef.current?.focus()
          }}
          style={{
            touchAction: 'none',
            cursor: getCursor(),
            width: '100%',
            height: '100%',
          }}
        />
        <EmptyCanvasState />
        <CanvasAccessibilityView onEditText={editTextFromAccessibility} />
        {editingText &&
          (() => {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return null
            // P1-1 性能优化: 仅在需要时读取 viewBox，避免订阅导致的频繁重渲染
            const viewBox = editingViewBox ?? useViewStore.getState().viewBox
            const screen = worldToClient({ x: editingText.x, y: editingText.y }, rect, viewBox)
            const screenX = screen.x
            const screenY = screen.y
            const lineHeight = getTextLineHeight(editingText.fontSize)
            const editorHeight = editingText.height
            const isEmptyText = editingText.content.length === 0
            // A newly-created text element is intentionally transparent and
            // borderless once it has content, but that same WYSIWYG treatment
            // makes the empty editor indistinguishable from the canvas. Keep
            // the affordance local to the transient editor and never persist
            // it to the element/store.
            const emptyEditorWidth = Math.max(editingText.width, 116)
            const emptyEditorHeight = Math.max(editorHeight, lineHeight + 10)
            const toolbarPosition = getTextToolbarPosition({
              anchorX: screenX,
              anchorY: screenY,
              editorHeight: editorHeight * viewBox.zoom,
              toolbarWidth: textToolbarMetrics.width,
              toolbarHeight: textToolbarMetrics.height,
              gap: 24,
              viewportWidth: viewportSize.width,
              viewportHeight: viewportSize.height,
            })
            const overlay = (
              <>
                <TextFormatToolbar
                  editingText={editingText}
                  toolbarRef={textToolbarRef}
                  textAreaRef={textRef}
                  left={toolbarPosition.left}
                  top={toolbarPosition.top}
                  onChange={(patch) => {
                    updateEditingTextFormat(patch)
                    scheduleTextRecoveryCheckpoint()
                  }}
                  onInteractionStart={(kind) => {
                    textInteractionRef.current = kind
                  }}
                  onInteractionEnd={() => {
                    textInteractionRef.current = null
                    if (document.hasFocus()) requestAnimationFrame(() => textRef.current?.focus())
                  }}
                  onBlurOutside={() => {
                    textInteractionRef.current = null
                    scheduleTextEditCommit(textEditSession)
                  }}
                />
                <textarea
                  ref={textRef}
                  autoFocus
                  className={
                    isEmptyText
                      ? 'canvas-text-editor canvas-text-editor-empty'
                      : 'canvas-text-editor'
                  }
                  data-testid="canvas-text-editor"
                  data-empty={isEmptyText ? 'true' : 'false'}
                  placeholder={isEmptyText ? '输入文字…' : undefined}
                  dir="auto"
                  wrap="off"
                  spellCheck={false}
                  aria-label="Edit text"
                  value={editingText.content}
                  onChange={(event) => {
                    updateEditingTextContent(event.currentTarget.value)
                    scheduleTextRecoveryCheckpoint()
                  }}
                  onCompositionEnd={(event) => {
                    updateEditingTextContent(event.currentTarget.value)
                    scheduleTextRecoveryCheckpoint()
                  }}
                  onKeyDown={(e) => {
                    const action = getTextEditKeyAction({
                      key: e.key,
                      ctrlKey: e.ctrlKey,
                      metaKey: e.metaKey,
                      shiftKey: e.shiftKey,
                      isComposing: e.nativeEvent.isComposing,
                      keyCode: e.keyCode,
                    })
                    if (action === 'commit') {
                      e.preventDefault()
                      commitCurrentTextEdit()
                    } else if (action === 'indent' || action === 'outdent') {
                      e.preventDefault()
                      const textarea = e.currentTarget
                      const result = applyTextIndentation(
                        textarea.value,
                        textarea.selectionStart ?? textarea.value.length,
                        textarea.selectionEnd ?? textarea.selectionStart ?? textarea.value.length,
                        action
                      )
                      updateEditingTextContent(result.value)
                      scheduleTextRecoveryCheckpoint()
                      requestAnimationFrame(() => {
                        if (textRef.current !== textarea) return
                        textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
                      })
                    }
                  }}
                  onBlur={(e) => {
                    const relatedTarget = e.relatedTarget as Node | null
                    if (relatedTarget && textToolbarRef.current?.contains(relatedTarget)) return
                    scheduleTextEditCommit(textEditSession)
                  }}
                  style={{
                    position: 'fixed',
                    left: screenX,
                    top: screenY,
                    width: isEmptyText ? emptyEditorWidth : editingText.width,
                    height: isEmptyText ? emptyEditorHeight : editorHeight,
                    minHeight: lineHeight,
                    margin: 0,
                    padding: isEmptyText ? '4px 8px' : 0,
                    boxSizing: isEmptyText ? 'border-box' : 'content-box',
                    fontFamily: TEXT_FONT_FAMILY,
                    fontSize: `${editingText.fontSize}px`,
                    fontWeight: editingText.fontWeight,
                    fontStyle: editingText.fontStyle,
                    textDecoration: editingText.textDecoration,
                    textAlign: editingText.textAlign,
                    lineHeight: `${lineHeight}px`,
                    color: editingText.color,
                    background:
                      editingText.backgroundColor ??
                      (isEmptyText ? 'var(--primary-bg)' : 'transparent'),
                    border: isEmptyText ? '1px solid var(--primary)' : 'none',
                    borderRadius: isEmptyText ? 4 : undefined,
                    outline: isEmptyText ? '2px solid var(--primary-light)' : 'none',
                    outlineOffset: isEmptyText ? 2 : undefined,
                    zIndex: 100,
                    boxShadow: isEmptyText ? '0 2px 10px rgba(20, 125, 120, 0.14)' : 'none',
                    resize: 'none',
                    overflow: 'hidden',
                    whiteSpace: editingText.wraps ? 'pre-wrap' : 'pre',
                    wordBreak: editingText.wraps ? 'break-word' : 'normal',
                    overflowWrap: 'break-word',
                    caretColor: editingText.color,
                    transform: `scale(${viewBox.zoom})`,
                    transformOrigin: 'top left',
                  }}
                />
              </>
            )
            return typeof document !== 'undefined' && document.body
              ? createPortal(overlay, document.body)
              : overlay
          })()}
      </div>
      {/* 右键上下文菜单 */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={handleCloseContextMenu} />
      )}
    </>
  )
}
