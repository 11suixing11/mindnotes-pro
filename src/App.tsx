import { useCallback, useRef, useState } from 'react'
import { Canvas } from './components/canvas'
import { Toolbar } from './components/toolbar'
import { Sidebar } from './components/sidebar'
import { ToastContainer } from './components/toast'
import { ConfirmModal } from './components/confirm-modal'
import { useAppStore } from './store/appStore'
import {
  KeyboardShortcutsHelp,
  KeyboardShortcutSettings,
} from './components/keyboard-shortcuts-help'
import { LoadingScreen } from './components/loading-screen'
import { Download } from 'lucide-react'
import { AppStatusBar } from './components/app/AppStatusBar'
import { useAppLifecycle } from './components/app/useAppLifecycle'

export default function App() {
  const mainContentRef = useRef<HTMLDivElement>(null)
  const loaded = useAppStore((state) => state.loaded)
  const bgColor = useAppStore((state) => state.bgColor)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shortcutSettingsOpen, setShortcutSettingsOpen] = useState(false)
  const handleShortcutsToggle = useCallback(() => setShortcutsOpen((open) => !open), [])
  const handleShortcutsClose = useCallback(() => setShortcutsOpen(false), [])
  const { canInstall, installApp } = useAppLifecycle(handleShortcutsToggle)

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
          const canvas = document.getElementById('main-canvas')
          if (canvas instanceof HTMLElement) {
            canvas.focus()
          } else {
            mainContentRef.current?.focus()
          }
        }}
      >
        跳到画布
      </a>
      <div
        className="app-shell"
        style={{ background: bgColor }}
        role="application"
        aria-label="MindNotes Pro 白板"
      >
        <Sidebar />
        <div ref={mainContentRef} tabIndex={-1} className="workspace-main">
          <Canvas />
          <Toolbar />
          <ToastContainer />
          <ConfirmModal />
          <AppStatusBar onOpenShortcuts={() => setShortcutsOpen(true)} />

          <KeyboardShortcutsHelp
            open={shortcutsOpen}
            onClose={handleShortcutsClose}
            onCustomize={() => {
              setShortcutsOpen(false)
              setShortcutSettingsOpen(true)
            }}
          />
          <KeyboardShortcutSettings
            open={shortcutSettingsOpen}
            onClose={() => setShortcutSettingsOpen(false)}
          />

          {canInstall && (
            <button
              onClick={() => void installApp()}
              className="install-btn"
              aria-label="安装 MindNotes Pro"
            >
              <Download size={16} aria-hidden="true" />
              安装应用
            </button>
          )}
        </div>
      </div>
    </>
  )
}
