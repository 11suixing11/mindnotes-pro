import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import LayersPanel from './components/LayersPanel'
import { useThemeStore } from './store/useThemeStore'
import { useMindNotesHotkeys } from './hooks/useMindNotesHotkeys'
import { useNetworkStatus } from './hooks/useNetworkStatus'

// 懒加载重量级组件（按需加载 framer-motion / jsPDF 等）
const WelcomeGuide = lazy(() => import('./components/WelcomeGuide'))
const SaveDialog = lazy(() => import('./components/SaveDialog'))
const ShortcutsPanel = lazy(() => import('./components/ShortcutsPanel'))
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette'))

export default function App() {
  const { initTheme } = useThemeStore()
  const [showGuide, setShowGuide] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)

  useMindNotesHotkeys()
  useNetworkStatus()

  useEffect(() => {
    initTheme()
    if (!localStorage.getItem('welcome-guide-seen')) {
      setShowGuide(true)
    }
  }, [initTheme])

  useEffect(() => {
    const handleToggleShortcuts = () => setShowShortcuts((v) => !v)
    const handleSave = () => setShowSaveDialog(true)
    const handleCommandPalette = () => setShowCommandPalette((v) => !v)

    window.addEventListener('toggle-shortcuts', handleToggleShortcuts)
    window.addEventListener('mindnotes-save', handleSave)
    window.addEventListener('toggle-command-palette', handleCommandPalette)

    return () => {
      window.removeEventListener('toggle-shortcuts', handleToggleShortcuts)
      window.removeEventListener('mindnotes-save', handleSave)
      window.removeEventListener('toggle-command-palette', handleCommandPalette)
    }
  }, [])

  const handleCanvasReady = useCallback((ref: HTMLCanvasElement | null) => {
    setCanvasRef(ref)
  }, [])

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[var(--bg-secondary)]">
      <Toolbar />
      <Canvas onCanvasRef={handleCanvasReady} />
      <LayersPanel />

      <Suspense fallback={null}>
        {showGuide && <WelcomeGuide onComplete={() => setShowGuide(false)} />}
        <SaveDialog isOpen={showSaveDialog} onClose={() => setShowSaveDialog(false)} canvas={canvasRef} />
        <ShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      </Suspense>
    </div>
  )
}
