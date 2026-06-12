import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import App from './App'

interface ErrorProps {
  children: ReactNode
}

interface ErrorState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<ErrorProps, ErrorState> {
  state: ErrorState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md shadow-xl text-center">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">出错了</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.reload()
              }}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
            >
              刷新页面
            </button>
          </div>
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
