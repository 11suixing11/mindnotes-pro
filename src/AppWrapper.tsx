import type { ErrorInfo, ReactNode } from 'react'
import { Component, lazy, Suspense } from 'react'
import { TriangleAlert } from 'lucide-react'
import './notes/floating.css'

const App = lazy(() => import('./App'))
const NotesApp = lazy(() => import('./notes/NotesApp'))
const NotesLanding = lazy(() => import('./notes/NotesLanding'))
const FloatingToolbar = lazy(() => import('./notes/FloatingToolbar'))
const ScreenAnnotationLayer = lazy(() => import('./notes/ScreenAnnotationLayer'))

interface ErrorProps {
  children: ReactNode
}

interface ErrorState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorProps, ErrorState> {
  state: ErrorState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
    window.mindnotesScreen?.releasePointer()
    void window.mindnotesFloating?.command('pointer').catch(() => undefined)
  }

  private exportRecovery = async () => {
    if (window.mindnotes?.isDesktop) {
      void window.mindnotes.exportNotes('json', 'all').catch(() => undefined)
      return
    }
    try {
      const [backupModule, filenameModule, storeModule, documentModule] = await Promise.all([
        import('./store/backup'),
        import('./components/export-menu/exportMenuModel'),
        import('./store/appStore'),
        import('./store/slices/documentRecords'),
      ])
      const { createCanvasBackup } = backupModule
      const { buildExportFilename } = filenameModule
      const { useAppStore } = storeModule
      const { createBlankDocument } = documentModule
      const state = useAppStore.getState()
      const currentDoc =
        state.docs.find((doc) => doc.id === state.currentDocId) ??
        state.docs[0] ??
        createBlankDocument()
      const backup = createCanvasBackup({
        ...currentDoc,
        elements: state.elements,
        layers: state.layers,
        activeLayerId: state.activeLayerId,
        bgColor: state.bgColor,
        backgroundStyle: state.backgroundStyle,
      })
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildExportFilename(currentDoc, 'json')
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 200)
    } catch {
      // Keep the recovery action best-effort; the stable error UI remains visible.
    }
  }

  render() {
    if (this.state.hasError) {
      if (window.mindnotesScreen) return <main className="screen-ink-surface" />
      if (window.mindnotesFloating) {
        return (
          <main className="floating-toolbar-surface">
            <div className="floating-toolbar-error" role="alert">
              <span>工具条暂时无法显示</span>
              <button onClick={() => window.location.reload()}>重试</button>
              <button onClick={() => void window.mindnotesFloating?.command('quit')}>退出</button>
            </div>
          </main>
        )
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
          <main
            className="bg-[var(--card-solid)] rounded-[8px] border border-[var(--border)] p-8 max-w-md shadow-[var(--shadow-lg)] text-center"
            aria-labelledby="error-boundary-title"
          >
            <TriangleAlert
              size={40}
              className="mx-auto mb-4 text-[var(--danger)]"
              aria-hidden="true"
            />
            <h1 id="error-boundary-title" className="text-xl font-semibold mb-2 text-[var(--text)]">
              应用暂时无法显示
            </h1>
            <p className="text-[var(--text-2)] mb-4 text-sm">
              应用暂时无法正常显示。你的内容仍保存在当前设备中，请先导出恢复备份。
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-[6px] hover:bg-[var(--primary-hover)]"
              >
                重试
              </button>
              <button
                type="button"
                onClick={this.exportRecovery}
                className="px-4 py-2 border border-[var(--border)] text-[var(--primary)] rounded-[6px] hover:border-[var(--primary)]"
              >
                导出恢复备份
              </button>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 text-sm text-[var(--text-3)] underline underline-offset-4"
            >
              刷新页面
            </button>
          </main>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Root() {
  const floatingSurface = window.mindnotesFloating
    ? 'floating-toolbar-surface'
    : window.mindnotesScreen
      ? 'screen-ink-surface'
      : null
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          floatingSurface ? (
            <main className={floatingSurface} />
          ) : (
            <main className="min-h-screen grid place-items-center" role="status">
              正在打开…
            </main>
          )
        }
      >
        {window.mindnotesFloating ? (
          <FloatingToolbar />
        ) : window.mindnotesScreen ? (
          <ScreenAnnotationLayer />
        ) : window.mindnotes?.isDesktop ? (
          <NotesApp />
        ) : new URLSearchParams(window.location.search).get('mode') === 'whiteboard' ? (
          <App />
        ) : (
          <NotesLanding />
        )}
      </Suspense>
    </ErrorBoundary>
  )
}
