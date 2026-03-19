import { useState, useEffect } from 'react'

interface WelcomeGuideProps {
  onComplete: () => void
}

export default function WelcomeGuide({ onComplete }: WelcomeGuideProps) {
  const [step, setStep] = useState(0)
  const [showGuide, setShowGuide] = useState(true)

  const steps = [
    {
      title: '欢迎使用 MindNotes Pro 🎉',
      description: '让灵感自由流淌的智能手写笔记工具',
      icon: '🧠',
    },
    {
      title: '手写笔记 ✍️',
      description: '在画布上随意书写，支持压感和多种笔刷',
      icon: '✏️',
    },
    {
      title: '文字输入 ⌨️',
      description: '点击文本工具，快速记录想法',
      icon: '📝',
    },
    {
      title: '快捷键 🎹',
      description: 'Ctrl+S 保存，Ctrl+Z 撤销，Delete 删除',
      icon: '⌨️',
    },
    {
      title: '开始创作吧！🚀',
      description: '点击"开始使用"，开启你的创作之旅',
      icon: '✨',
    },
  ]

  useEffect(() => {
    // 检查是否已显示过引导
    const hasSeenGuide = localStorage.getItem('welcome-guide-seen')
    if (hasSeenGuide) {
      setShowGuide(false)
      onComplete()
    }
  }, [onComplete])

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem('welcome-guide-seen', 'true')
      setShowGuide(false)
      onComplete()
    }
  }

  const handleSkip = () => {
    localStorage.setItem('welcome-guide-seen', 'true')
    setShowGuide(false)
    onComplete()
  }

  if (!showGuide) return null

  const currentStep = steps[step]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
        {/* 进度指示器 */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index <= step
                  ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500'
                  : 'w-2 bg-gray-300 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* 内容区域 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{currentStep.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {currentStep.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {currentStep.description}
          </p>
        </div>

        {/* 按钮区域 */}
        <div className="flex gap-3">
          {step < steps.length - 1 ? (
            <>
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-all"
              >
                跳过
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
              >
                下一步
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              开始使用 →
            </button>
          )}
        </div>

        {/* 快捷键提示 */}
        {step === steps.length - 1 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <p className="mb-2">💡 常用快捷键：</p>
              <div className="flex justify-center gap-4 flex-wrap">
                <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+S</kbd> 保存</span>
                <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+Z</kbd> 撤销</span>
                <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Delete</kbd> 删除</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
