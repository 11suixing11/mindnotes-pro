import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 * 
 * 使用示例：
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <Canvas />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo)
    
    // 调用外部错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 可以在这里上报错误到监控服务
    // reportErrorToService(error, errorInfo)
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary-fallback" style={{
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '2rem auto',
          border: '1px solid #e74c3c',
          borderRadius: '8px',
          backgroundColor: '#fdf2f2',
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>
            ⚠️ 出错了
          </h2>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            抱歉，某个组件出现了问题。您可以尝试刷新页面或重新加载。
          </p>
          {this.state.error && (
            <details style={{
              textAlign: 'left',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>
                错误详情（点击展开）
              </summary>
              <pre style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.75rem',
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            🔄 重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
