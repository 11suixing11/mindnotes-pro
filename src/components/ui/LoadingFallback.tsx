interface LoadingFallbackProps {
  label?: string
  fullScreen?: boolean
}

export default function LoadingFallback({
  label = '正在加载模块...',
  fullScreen = false,
}: LoadingFallbackProps) {
  const wrapperClass = fullScreen
    ? 'fixed inset-0 z-50 bg-[var(--bg-secondary)]/80 backdrop-blur-sm'
    : 'absolute inset-0 z-20 bg-[var(--bg-secondary)]/70 backdrop-blur-sm'

  return (
    <div className={wrapperClass} role="status" aria-live="polite" aria-label={label}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--toolbar-bg)] px-6 py-5 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 rounded-full border-2 border-[var(--text-secondary)] border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
          </div>
          <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--text-secondary)]/60" />
          </div>
        </div>
      </div>
    </div>
  )
}