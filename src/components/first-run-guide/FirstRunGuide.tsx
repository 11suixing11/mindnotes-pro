import { useState, useEffect, memo } from 'react'

const STEPS = [
  {
    title: '欢迎使用 MindNotes',
    desc: '一个轻量的本地白板，打开即画，数据存在你的浏览器里。',
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

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false)
        localStorage.setItem('mn-guide-seen', '1')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible])

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[500] bg-[rgba(0,0,0,0.45)] backdrop-blur-[3px] flex items-center justify-center"
      style={{ animation: 'fadeIn 0.2s ease' }}
      onClick={() => {
        setVisible(false)
        localStorage.setItem('mn-guide-seen', '1')
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card-solid)] rounded-[16px] py-[28px] px-[32px] max-w-[380px] w-[90vw] shadow-[0_8px_40px_rgba(0,0,0,0.2)] border border-[var(--border)] text-center"
        style={{ animation: 'popIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="text-[40px] mb-[12px]">{s.icon}</div>
        <div className="text-[17px] font-bold text-[var(--text)] mb-[8px]">{s.title}</div>
        <div className="text-[13px] text-[var(--text-2)] leading-[1.7] mb-[20px]">{s.desc}</div>
        <div className="flex gap-[4px] justify-center mb-[16px]">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`${i === step ? 'w-[20px]' : 'w-[6px]'} h-[6px] rounded-[3px] ${i === step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'} transition-all duration-200 ease-in-out`}
            />
          ))}
        </div>
        <div className="flex gap-[8px] justify-center">
          <button
            onClick={() => {
              setVisible(false)
              localStorage.setItem('mn-guide-seen', '1')
            }}
            className="py-[7px] px-[18px] rounded-[8px] border border-[var(--border)] bg-transparent text-[var(--text-3)] text-[12px] cursor-pointer font-semibold"
            aria-label="跳过引导"
          >
            跳过
          </button>
          <button
            onClick={() => {
              if (isLast) {
                setVisible(false)
                localStorage.setItem('mn-guide-seen', '1')
              } else setStep(step + 1)
            }}
            className="py-[7px] px-[22px] rounded-[8px] border-none bg-[var(--primary)] text-white text-[12px] cursor-pointer font-semibold shadow-[0_2px_8px_var(--glow)]"
            aria-label={isLast ? '开始创作' : '下一步'}
          >
            {isLast ? '开始创作' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
})
