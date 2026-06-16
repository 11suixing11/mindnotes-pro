import { memo } from 'react'
import { useToastStore } from '../../store/toastStore'
import type { ToastType } from '../../store/toastStore'

const icons: Record<ToastType, string> = {
  info: 'ℹ',
  success: '✓',
  error: '✕',
  warning: '⚠',
}

const typeColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  info: { bg: 'var(--primary-bg)', border: 'var(--primary)', icon: 'var(--primary)' },
  success: { bg: 'rgba(106,154,88,0.1)', border: 'var(--success)', icon: 'var(--success)' },
  error: { bg: 'rgba(200,90,90,0.1)', border: 'var(--danger)', icon: 'var(--danger)' },
  warning: { bg: 'rgba(208,184,136,0.15)', border: 'var(--monet-gold)', icon: 'var(--monet-gold)' },
}

export default memo(function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="通知"
      className="fixed top-[60px] right-[16px] z-[200] flex flex-col gap-[8px] pointer-events-none"
    >
      {toasts.map((t) => {
        const c = typeColors[t.type]
        return (
          <div
            key={t.id}
            role="status"
            aria-label={`${t.type}通知: ${t.message}`}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex items-center gap-[10px] py-[10px] px-[16px] rounded-[12px] backdrop-blur-[20px] backdrop-saturate-[150] cursor-pointer max-w-[320px]"
            style={{
              background: c.bg,
              border: `1.5px solid ${c.border}`,
              boxShadow: 'var(--shadow-md)',
              animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <span
              className="text-[14px] font-bold w-[20px] h-[20px] rounded-full flex items-center justify-center shrink-0"
              style={{ color: c.icon }}
            >
              {icons[t.type]}
            </span>
            <span className="text-[13px] font-medium text-[var(--text)] leading-[1.4]">
              {t.message}
            </span>
          </div>
        )
      })}
    </div>
  )
})
