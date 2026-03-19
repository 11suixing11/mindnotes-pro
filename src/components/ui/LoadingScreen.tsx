import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  onLoad?: () => void
}

export default function LoadingScreen({ onLoad }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('正在加载 MindNotes Pro...')

  useEffect(() => {
    // 模拟加载进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          onLoad?.()
          return 100
        }
        return prev + Math.random() * 20
      })
    }, 200)

    // 更新加载信息
    const messages = [
      '正在加载 MindNotes Pro...',
      '初始化画布引擎...',
      '加载工具组件...',
      '准备就绪...',
    ]

    const messageInterval = setInterval(() => {
      setMessage(messages[Math.floor(progress / 25)] || messages[messages.length - 1])
    }, 500)

    return () => {
      clearInterval(interval)
      clearInterval(messageInterval)
    }
  }, [onLoad, progress])

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
          <p>首次加载可能需要几秒钟</p>
          <p>后续访问会更快</p>
        </div>
      </div>
    </div>
  )
}
