import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  onLoad?: () => void
}

export default function LoadingScreen({ onLoad }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('正在加载 MindNotes Pro...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const messages = [
      '正在加载 MindNotes Pro...',
      '初始化画布引擎...',
      '加载工具组件...',
      '准备就绪...',
    ]

    // 模拟加载进度，并在回调中同步更新消息（避免 stale closure）
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.random() * 20, 100)
        setMessage(messages[Math.min(Math.floor(next / 25), messages.length - 1)])
        if (next >= 100) {
          clearInterval(interval)
          onLoad?.()
        }
        return next
      })
    }, 200)

    return () => {
      clearInterval(interval)
    }
  }, [onLoad])

  // 错误状态
  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 flex items-center justify-center z-50 p-4">
        <div className="text-center text-white max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-4">加载失败</h1>
          <p className="mb-6 opacity-90">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-all"
            >
              🔄 重试
            </button>
            
            <button
              onClick={() => {
                setProgress(0)
                setError(null)
                setMessage('正在加载 MindNotes Pro...')
              }}
              className="w-full px-6 py-3 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-all"
            >
              🏠 返回首页
            </button>
          </div>
          
          <div className="mt-8 text-xs opacity-70">
            <p>💡 提示：检查网络连接</p>
            <p>或清除浏览器缓存后重试</p>
          </div>
        </div>
      </div>
    )
  }

  // 正常加载状态
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center z-50">
      <div className="text-center text-white">
        {/* Logo 动画 */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <span className="text-5xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">MindNotes Pro</h1>
          <p className="text-white/80 text-sm">让灵感自由流淌</p>
        </div>

        {/* 加载进度 */}
        <div className="w-64 mx-auto mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-sm mt-2 text-white/80">{message}</p>
        </div>

        {/* 加载提示 */}
        <div className="mt-8 text-xs text-white/60">
          <p>💡 首次加载可能需要几秒钟</p>
          <p>后续访问会更快</p>
        </div>
      </div>
    </div>
  )
}
