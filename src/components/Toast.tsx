import { useToastStore } from '../store/toastStore'
import type { ToastType } from '../store/toastStore'

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

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 60, right: 16, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const c = typeColors[t.type]
        return (
          <div key={t.id} onClick={() => dismiss(t.id)} style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 12,
            background: c.bg,
            border: `1.5px solid ${c.border}`,
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
            maxWidth: 320,
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: c.icon,
              width: 20, height: 20, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{icons[t.type]}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
              {t.message}
            </span>
          </div>
        )
      })}
    </div>
  )
}