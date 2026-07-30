import { useState, useEffect, memo, useCallback } from 'react'
import { FEEDBACK_DISCUSSION_URL } from '../../productLinks'

const STEPS = [
  {
    title: '欢迎使用 MindNotes Pro',
    desc: '一个本地优先的白板，打开即画，数据存在你的浏览器里。',
    icon: '🎨',
  },
  {
    title: '画布管理',
    desc: '点左上角 ☰ 打开侧边栏，可以新建、重命名、分组多个画布。',
    icon: '📂',
  },
  {
    title: '右键菜单',
    desc: '在侧边栏的画布或文件夹上右键（手机长按），可以复制、重命名、删除。',
    icon: '🖱️',
  },
  {
    title: '快捷键',
    desc: 'Ctrl+Z 撤销 · Ctrl+C/V 复制粘贴 · Del 删除 · 滚轮缩放 · 按 ? 显示提示',
    icon: '⌨️',
  },
]

export default memo(function FirstRunGuide() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(() => !localStorage.getItem('mn-guide-seen'))
  const closeGuide = useCallback(() => {
    setVisible(false)
    localStorage.setItem('mn-guide-seen', '1')
  }, [])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeGuide()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeGuide, visible])

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="first-run-guide" role="region" aria-label="首次使用引导">
      <div className="first-run-guide-card panel" aria-live="polite">
        <div className="first-run-guide-icon">{s.icon}</div>
        <div className="first-run-guide-title">{s.title}</div>
        <div className="first-run-guide-desc">{s.desc}</div>
        <div className="first-run-guide-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div key={i} className={`first-run-guide-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="first-run-guide-actions">
          <a
            href={FEEDBACK_DISCUSSION_URL}
            target="_blank"
            rel="noreferrer"
            className="first-run-guide-link"
            aria-label="反馈"
          >
            反馈
          </a>
          <button
            onClick={closeGuide}
            className="first-run-guide-button"
            aria-label="跳过引导"
          >
            跳过
          </button>
          <button
            onClick={() => {
              if (isLast) {
                closeGuide()
              } else setStep(step + 1)
            }}
            className="first-run-guide-button primary"
            aria-label={isLast ? '开始创作' : '下一步'}
          >
            {isLast ? '开始创作' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
})
