import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WelcomeGuideProps {
  onComplete: () => void
}

const steps = [
  {
    icon: '🧠',
    title: '欢迎使用 MindNotes Pro',
    desc: '无限画布 · 自由书写 · 你的想法，不设边界',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    icon: '✏️',
    title: '手写绘制',
    desc: '按住鼠标或手指即可书写，支持多种颜色和粗细',
    tips: ['按 1 切换画笔', '按 2 切换橡皮'],
  },
  {
    icon: '📐',
    title: '形状工具',
    desc: '矩形、圆形、三角形、直线、箭头，随心绘制',
    tips: ['按 4-8 快速切换', '拖拽调整大小'],
  },
  {
    icon: '⚡',
    title: '快捷操作',
    desc: '高效键盘流，告别鼠标菜单',
    tips: ['Ctrl+Z 撤销', 'Ctrl+S 保存', '+/- 缩放', '? 查看全部'],
  },
]

export default function WelcomeGuide({ onComplete }: WelcomeGuideProps) {
  const [step, setStep] = useState(0)

  const handleComplete = () => {
    localStorage.setItem('welcome-guide-seen', 'true')
    onComplete()
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleComplete}
      />

      {/* 卡片 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.4 }}
        >
          {/* 渐变头部 */}
          <div className={`bg-gradient-to-r ${current.color} p-8 text-center text-white`}>
            <motion.div
              className="text-6xl mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
            >
              {current.icon}
            </motion.div>
            <h2 className="text-2xl font-bold">{current.title}</h2>
          </div>

          {/* 内容 */}
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 text-center text-lg mb-4">
              {current.desc}
            </p>

            {current.tips && (
              <div className="space-y-2 mb-4">
                {current.tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <span className="text-indigo-500">→</span>
                    <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono text-gray-700 dark:text-gray-300">
                      {tip.split(' ')[0]}
                    </kbd>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {tip.split(' ').slice(1).join(' ')}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 进度点 */}
            <div className="flex justify-center gap-2 my-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500'
                      : i < step
                        ? 'w-2 bg-indigo-300'
                        : 'w-2 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
              >
                跳过
              </button>
              <button
                onClick={handleNext}
                className={`flex-1 px-4 py-3 rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all ${
                  isLast
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                }`}
              >
                {isLast ? '🎨 开始创作' : '下一步 →'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
