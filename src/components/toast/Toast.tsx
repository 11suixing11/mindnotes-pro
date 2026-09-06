import { memo } from 'react'
import { X } from 'lucide-react'
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

const typeLabels: Record<ToastType, string> = {
  info: '信息',
  success: '成功',
  error: '错误',
  warning: '警告',
}

export default memo(function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-[60px] right-[16px] z-[200] flex flex-col gap-[8px] pointer-events-none">
      {toasts.map((t) => {
        const c = typeColors[t.type]
        const liveRole = t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-[10px] py-[10px] pl-[16px] pr-[8px] rounded-[12px] backdrop-blur-[20px] backdrop-saturate-[150] max-w-[320px]"
            style={{
              background: c.bg,
              border: `1.5px solid ${c.border}`,
              boxShadow: 'var(--shadow-md)',
              animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <span
              aria-hidden="true"
              className="text-[14px] font-bold w-[20px] h-[20px] rounded-full flex items-center justify-center shrink-0"
              style={{ color: c.icon }}
            >
              {icons[t.type]}
            </span>
            <span
              role={liveRole}
              aria-atomic="true"
              className="min-w-0 flex-1 text-[14px] font-normal text-[var(--text)] leading-[1.4]"
            >
              <span className="sr-only">{typeLabels[t.type]}：</span>
              {t.message}
            </span>
            <button
              type="button"
              aria-label={`关闭通知：${t.message}`}
              title="关闭通知"
              onClick={() => dismiss(t.id)}
              className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] border-0 bg-transparent text-[var(--text-3)] cursor-pointer hover:bg-[var(--primary-bg)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
})
