import { useEffect, useState } from 'react'
import { Canvas } from './components/canvas'
import { Toolbar } from './components/toolbar'
import { ToastContainer } from './components/toast'
import { ConfirmModal } from './components/confirm-modal'
import { useAppStore } from './store/appStore'
import { useViewStore } from './store/useViewStore'
import { useThemeStore } from './store/useThemeStore'
import { getContentBounds } from './canvas/canvasUtils'
import { FirstRunGuide } from './components/first-run-guide'

const TOOL_LABELS: Record<string, string> = {
  select: '选择',
  pen: '画笔',
  eraser: '橡皮',
  pan: '平移',
  text: '文字',
  rectangle: '矩形',
  circle: '圆形',
  line: '直线',
  arrow: '箭头',
}

export default function App() {
  const { initTheme } = useThemeStore()
  const init = useAppStore((s) => s.init)
  const loaded = useAppStore((s) => s.loaded)
  const tool = useAppStore((s) => s.tool)
  const elements = useAppStore((s) => s.elements)
  const bgColor = useAppStore((s) => s.bgColor)
  const docs = useAppStore((s) => s.docs)
  const [hintsVisible, setHintsVisible] = useState(() => !localStorage.getItem('mn-hints-seen'))
  const saveStatus = useAppStore((s) => s.saveStatus)
  const zoom = useViewStore((s) => s.viewBox.zoom)
  const zoomToFit = useViewStore((s) => s.zoomToFit)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setDeferredPrompt(null))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: bgColor,
      }}
    >
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Canvas />
        <Toolbar />
        <ToastContainer />
        <ConfirmModal />

        <div className="status panel">
          <span className="dot" />
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {TOOL_LABELS[tool] ?? tool}
          </span>
          <span className="vl" />
          <span>{elements.length} 元素</span>
          <span className="vl" />
          <span>{docs.length} 画布</span>
          <span className="vl" />
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const bounds = getContentBounds(useAppStore.getState().elements)
              if (bounds) zoomToFit(bounds)
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <span className="vl" />
          <span
            style={{
              fontSize: '10px',
              color: saveStatus === 'saving' ? 'var(--text-4)' : 'var(--success)',
              transition: 'color 0.3s',
            }}
          >
            {saveStatus === 'saving'
              ? '\u00b7\u00b7\u00b7'
              : saveStatus === 'saved'
                ? '\u2713'
                : ''}
          </span>
        </div>

        {hintsVisible && (
          <div className="hints panel">
            <kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · <kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd> 复制粘贴 ·{' '}
            <kbd>Ctrl</kbd>+<kbd>A</kbd> 全选 · 滚轮缩放 · <kbd>Del</kbd> 删除
          </div>
        )}

        <FirstRunGuide />

        {deferredPrompt && (
          <button
            onClick={async () => {
              ;(deferredPrompt as any).prompt()
              await (deferredPrompt as any).userChoice
              setDeferredPrompt(null)
            }}
            style={{
              position: 'fixed',
              bottom: 48,
              right: 16,
              zIndex: 100,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card-solid)',
              backdropFilter: 'var(--glass)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              animation: 'popIn 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            安装到桌面
          </button>
        )}
      </div>
    </div>
  )
}
