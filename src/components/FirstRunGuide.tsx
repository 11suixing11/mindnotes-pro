import { useState, useEffect } from 'react'

const STEPS = [
  { title: '欢迎使用 MindNotes', desc: '一个轻量的本地白板，打开即画，数据存在你的浏览器里。', icon: '🎨' },
  { title: '画布管理', desc: '点左上角 ☰ 打开侧边栏，可以新建、重命名、分组多个画布。', icon: '📂' },
  { title: '右键菜单', desc: '在侧边栏的画布或文件夹上右键（手机长按），可以复制、重命名、删除。', icon: '🖱️' },
  { title: '快捷键', desc: 'Ctrl+Z 撤销 · Ctrl+C/V 复制粘贴 · Del 删除 · 滚轮缩放 · 按 ? 显示提示', icon: '⌨️' },
]

export default function FirstRunGuide() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(() => !localStorage.getItem('mn-guide-seen'))

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setVisible(false); localStorage.setItem('mn-guide-seen', '1') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible])

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={() => { setVisible(false); localStorage.setItem('mn-guide-seen', '1') }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--card-solid)', borderRadius: 16, padding: '28px 32px',
        maxWidth: 380, width: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        border: '1px solid var(--border)', animation: 'popIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{s.icon}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{s.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20 }}>{s.desc}</div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.2s ease',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => { setVisible(false); localStorage.setItem('mn-guide-seen', '1') }} style={{
            padding: '7px 18px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-3)', fontSize: 12,
            cursor: 'pointer', fontWeight: 600,
          }} aria-label="跳过引导">跳过</button>
          <button onClick={() => {
            if (isLast) { setVisible(false); localStorage.setItem('mn-guide-seen', '1') }
            else setStep(step + 1)
          }} style={{
            padding: '7px 22px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 12,
            cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px var(--glow)',
          }} aria-label={isLast ? "开始创作" : "下一步"}>{isLast ? '开始创作' : '下一步'}</button>
        </div>
      </div>
    </div>
  )
}
