import { useEffect, useState, useCallback, useRef } from 'react'
import { Canvas } from './components/canvas'
import { Toolbar } from './components/toolbar'
import { Sidebar } from './components/sidebar'
import { useEraserKeyboardShortcuts } from './eraser/useEraserKeyboardShortcuts'
import { ToastContainer } from './components/toast'
import { ConfirmModal } from './components/confirm-modal'
import { useAppStore } from './store/appStore'
import { useViewStore } from './store/useViewStore'
import { useThemeStore } from './store/useThemeStore'
import { getContentBounds } from './canvas/canvasUtils'
import { FirstRunGuide } from './components/first-run-guide'
import { KeyboardShortcutsHelp } from './components/keyboard-shortcuts-help'
import { LoadingScreen } from './components/loading-screen'
import { EmptyCanvasHint } from './components/empty-canvas-hint'
import { useScreenPen, ScreenPenControls } from './components/screen-pen'
import { EraserControls } from './components/eraser'
import { FEEDBACK_DISCUSSION_URL } from './productLinks'
import type { ToolType } from './store/types'

const TOOL_LABELS: Record<string, string> = {
  select: 'Select',
  pen: 'Pen',
  eraser: 'Eraser',
  pan: 'Pan',
  text: 'Text',
  rectangle: 'Rectangle',
  circle: 'Circle',
  line: 'Line',
  arrow: 'Arrow',
}

export default function App() {
  const { initTheme } = useThemeStore()
  const mainContentRef = useRef<HTMLDivElement>(null)
  const init = useAppStore((s) => s.init)
  const loaded = useAppStore((s) => s.loaded)
  const tool = useAppStore((s) => s.tool)
  // P1-9/只订阅 length 而非完整数组，避免不必要的 re-render
  const elementCount = useAppStore((s) => s.elements.length)
  const bgColor = useAppStore((s) => s.bgColor)
  const docCount = useAppStore((s) => s.docs.length)
  const [hintsVisible, setHintsVisible] = useState(() => !localStorage.getItem('mn-hints-seen'))
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const saveStatus = useAppStore((s) => s.saveStatus)
  const zoom = useViewStore((s) => s.viewBox.zoom)
  const zoomToFit = useViewStore((s) => s.zoomToFit)
  const screenPen = useScreenPen()

  // 橡皮擦键盘快捷键
  useEraserKeyboardShortcuts()
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: string }>
  }
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    initTheme()
    init()
  }, [initTheme, init])

  useEffect(() => {
    const handleBeforeUnload = () => {
      useAppStore.getState().saveNow()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    if (!hintsVisible) return
    const timer = setTimeout(() => {
      setHintsVisible(false)
      localStorage.setItem('mn-hints-seen', '1')
    }, 3000)
    return () => clearTimeout(timer)
  }, [hintsVisible])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) setHintsVisible((v) => !v)
      if (e.key === 'F1') {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
      }
      // Ctrl+D 快速复制，遵循常见设计工具交互
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        useAppStore.getState().duplicateSelected()
      }
      // Ctrl+G 元素分组
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        useAppStore.getState().groupSelected()
      }
      // Ctrl+Shift+G 取消分组
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        useAppStore.getState().ungroupSelected()
      }

      // 数字键 1-9 快速切换工具
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const toolMap: Record<string, ToolType | undefined> = {
          '1': 'select',
          '2': 'pen',
          '3': 'text',
          '4': 'rectangle',
          '5': 'circle',
          '6': 'line',
          '7': 'arrow',
          '8': 'eraser',
          '9': 'pan',
        }
        const targetTool = toolMap[e.key]
        if (targetTool) {
          useAppStore.getState().setTool(targetTool)
        }
      }
      // Shift + 数字键 1-9, 0 快速选择颜色
      // 一键切换调色板前10个颜色，减少工具栏往返操作
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && /^[0-9]$/.test(e.key)) {
        e.preventDefault()
        // 调色板前10个颜色，按显示顺序映射：1-9 对应前9个，0 对应第10个
        const colorPalette = [
          '#1A1A1A', // 1: 纯黑
          '#4A4A4A', // 2: 深灰
          '#7A7A7A', // 3: 中灰
          '#A0A0A0', // 4: 浅灰
          '#D0D0D0', // 5: 亮灰
          '#E03131', // 6: 红色
          '#F59F00', // 7: 橙色
          '#2B8A3E', // 8: 绿色
          '#1971C2', // 9: 蓝色
          '#7950F2', // 0: 靛蓝
        ]
        const index = e.key === '0' ? 9 : parseInt(e.key) - 1
        const targetColor = colorPalette[index]
        if (targetColor) {
          useAppStore.getState().setColor(targetColor)
        }
      }
      // Q 键快速复制悬停元素样式
      // 悬停在元素上按 Q 键直接复制样式，减少一次模式切换
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        const state = useAppStore.getState()
        // 优先使用 usePointerEngine 中跟踪的悬停元素 ID（最准确）
        const hoveredRef = (window as any).__mindnotes_hovered_element_id__
        const hoveredId = hoveredRef?.current ?? null

        if (hoveredId) {
          // 有悬停元素：直接复制其样式
          state.applyStyleFromElement(hoveredId)
        } else {
          // 无悬停元素：切换样式吸管模式（传统吸管模式）
          state.toggleStyleEyedropper()
        }
      }
      // G 键循环切换几何工具
      // 遵循常见设计工具快捷键习惯
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        useAppStore.getState().cycleGeometryTool()
      }

      // Cmd/Ctrl+2 缩放到选中元素
      // 设计参考: Figma Cmd+2, Sketch Cmd+2, Graphic Cmd+2 - 行业标准快捷键
      // 用户价值：复杂画布中一键定位到选中元素，无需手动滚动缩放
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '2') {
        e.preventDefault()
        useViewStore.getState().zoomToSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const installedHandler = () => setDeferredPrompt(null)
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleShortcutsClose = useCallback(() => setShortcutsOpen(false), [])

  if (!loaded) {
    return <LoadingScreen />
  }

  return (
    <>
      {/* Skip-to-content link for screen readers */}
      <a
        href="#main-canvas"
        className="skip-to-content"
        onClick={(e) => {
          e.preventDefault()
          mainContentRef.current?.focus()
          document.getElementById('main-canvas')?.focus()
        }}
      >
        Skip to canvas
      </a>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          overflow: 'hidden',
          background: bgColor,
        }}
        role="application"
        aria-label="MindNotes Pro - Whiteboard Application"
      >
        <Sidebar />
        <div
          ref={mainContentRef}
          tabIndex={-1}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', outline: 'none' }}
        >
          <Canvas />
          <Toolbar />
          <ToastContainer />
          <ConfirmModal />
          <ScreenPenControls screenPen={screenPen} />

          {/* 橡皮擦控制面板 - 仅在橡皮擦工具时显示 */}
          {tool === 'eraser' && <EraserControls />}

          <div className="status panel" role="status" aria-label="Application status">
            <span className="dot" aria-hidden="true" />
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {TOOL_LABELS[tool] ?? tool}
            </span>
            <span className="vl" aria-hidden="true" />
            <span>{elementCount} elements</span>
            <span className="vl" aria-hidden="true" />
            <span>{docCount} docs</span>
            <span className="vl" aria-hidden="true" />
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const bounds = getContentBounds(useAppStore.getState().elements)
                if (bounds) zoomToFit(bounds)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const bounds = getContentBounds(useAppStore.getState().elements)
                  if (bounds) zoomToFit(bounds)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Zoom ${Math.round(zoom * 100)} percent - Click to fit content`}
            >
              {Math.round(zoom * 100)}%
            </span>
            <span className="vl" aria-hidden="true" />
            <span
              style={{
                fontSize: '10px',
                color: saveStatus === 'saving' ? 'var(--text-4)' : 'var(--success)',
                transition: 'color 0.3s',
              }}
              aria-live="polite"
              aria-label={
                saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : ''
              }
            >
              {saveStatus === 'saving'
                ? '\u00b7\u00b7\u00b7'
                : saveStatus === 'saved'
                  ? '\u2713'
                  : ''}
            </span>
            <span className="vl" aria-hidden="true" />
            <a
              href={FEEDBACK_DISCUSSION_URL}
              target="_blank"
              rel="noreferrer"
              className="status-feedback"
              title="Share feedback"
              aria-label="Share feedback"
            >
              Feedback
            </a>
            <span className="vl" aria-hidden="true" />
            <button
              onClick={() => setShortcutsOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-4)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 2px',
                lineHeight: 1,
                borderRadius: '4px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-4)')}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              ?
            </button>
          </div>

          {hintsVisible && (
            <div className="hints panel">
              <kbd>1-9</kbd> Switch Tools · <kbd>Shift</kbd>+<kbd>1-0</kbd> Quick Colors · <kbd>Q</kbd> Copy Style · <kbd>G</kbd> Cycle Shapes · <kbd>Z</kbd> Eagle Eye · <kbd>Ctrl</kbd>+<kbd>2</kbd> Zoom Selection · <kbd>Double-click</kbd> Shape/Text to Edit · <kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo · <kbd>Ctrl</kbd>+<kbd>Y</kbd> Redo · <kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd>{' '}
              Copy/Paste · <kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicate · <kbd>Ctrl</kbd>+<kbd>G</kbd> Group ·{' '}
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> Ungroup · <kbd>Ctrl</kbd>+<kbd>A</kbd> Select all · Scroll to zoom ·{' '}
              <kbd>Del</kbd> Delete · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> Screen Pen
            </div>
          )}

          <EmptyCanvasHint />
          <FirstRunGuide />
          <KeyboardShortcutsHelp open={shortcutsOpen} onClose={handleShortcutsClose} />

          {deferredPrompt && (
            <button
              onClick={async () => {
                deferredPrompt.prompt()
                await deferredPrompt.userChoice
                setDeferredPrompt(null)
              }}
              className="install-btn"
              aria-label="Install MindNotes Pro"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              Install App
            </button>
          )}
        </div>
      </div>
    </>
  )
}
