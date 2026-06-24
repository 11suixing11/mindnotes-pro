import { useEffect, useState, useCallback, useRef } from 'react'
import { Canvas } from './components/canvas'
import { Toolbar } from './components/toolbar'
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
  // P1-9/P1-10 修复: 只订阅 length 而非完整数组，避免不必要的 re-render
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
      // P9 新功能: Ctrl+D 快速复制 (Excalidraw / Figma / tldraw 标准快捷键)
      // 专业设计软件标准交互：一键复制选中元素
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        useAppStore.getState().duplicateSelected()
      }
      // P10 新功能: Ctrl+G 元素分组 (Excalidraw / Figma / tldraw 标准功能)
      // 专业设计软件标准交互：将选中元素组合成组
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        useAppStore.getState().groupSelected()
      }
      // P10 新功能: Ctrl+Shift+G 取消分组 (Excalidraw / Figma / tldraw 标准功能)
      // 专业设计软件标准交互：解散选中的组
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        useAppStore.getState().ungroupSelected()
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
              <kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo · <kbd>Ctrl</kbd>+<kbd>Y</kbd> Redo · <kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd>{' '}
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
