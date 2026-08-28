import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { TriangleAlert } from 'lucide-react'
import App from './App'
import { createCanvasBackup } from './store/backup'
import { buildExportFilename } from './components/export-menu/exportMenuModel'
import { useAppStore } from './store/appStore'
import { createBlankDocument } from './store/slices/documentRecords'

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
  }

  private exportRecovery = () => {
    try {
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
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}
