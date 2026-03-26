import React, { useState, useEffect } from 'react'

interface Step {
  title: string
  description: string
  icon: string
  tip?: string
}

interface OnboardingGuideProps {
  onComplete: () => void
}

const steps: Step[] = [
  {
    title: '欢迎使用 MindNotes Pro！🎉',
    description: '这是一款免费、开源的手写与文字混合笔记应用。让我们快速了解一下主要功能。',
    icon: '👋',
  },
  {
    title: '手写笔记 ✍️',
    description: '点击左侧工具栏的画笔工具，在画布上自由书写。支持压感，书写流畅自然。',
    icon: '🖊️',
    tip: '提示：可以使用数字键 1-5 快速切换工具',
  },
  {
    title: '文字输入 ⌨️',
    description: '点击文字工具（T 图标），在画布上添加文本框。手写和文字可以自由混合使用。',
    icon: '📝',
  },
  {
    title: '智能模板 🎯',
    description: '点击模板按钮，选择专业笔记模板（康奈尔、子弹笔记等），让笔记更有条理。',
    icon: '📋',
  },
  {
    title: '命令面板 ⚡',
    description: '按下 Ctrl+P（或 Cmd+P）打开命令面板，快速访问所有功能。',
    icon: '⌨️',
    tip: '提示：命令面板支持模糊搜索',
  },
  {
    title: '多格式导出 📤',
    description: '完成笔记后，可以导出为 PNG、SVG、PDF 或 Markdown 格式，方便分享和存档。',
    icon: '💾',
  },
  {
    title: '开始创作！🚀',
    description: '现在你已经了解了基本功能，开始创建你的第一个笔记吧！',
    icon: '🎨',
  },
]

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isExiting, setIsExiting] = useState(false)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setIsExiting(true)
    setTimeout(onComplete, 300)
  }

  const handleComplete = () => {
    setIsExiting(true)
    setTimeout(() => {
      localStorage.setItem('mindnotes-onboarding-seen', '1')
      onComplete()
    }, 300)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      handleNext()
    } else if (e.key === 'ArrowLeft') {
      handlePrev()
    } else if (e.key === 'Escape') {
      handleSkip()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep])

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleSkip}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 进度条 */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 内容区域 */}
        <div className="p-8">
          {/* 图标 */}
          <div className="text-6xl mb-6 text-center">{step.icon}</div>

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            {step.title}
          </h2>

          {/* 描述 */}
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* 提示 */}
          {step.tip && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-6">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 {step.tip}
              </p>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              跳过引导
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← 上一步
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
              >
                {currentStep === steps.length - 1 ? '开始使用' : '下一步'} →
              </button>
            </div>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`跳转到第${index + 1}步`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default OnboardingGuide
