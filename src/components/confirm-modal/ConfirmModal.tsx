import { useState, useEffect, memo } from 'react'
import type { ConfirmOptions } from './useConfirm'
import { queue } from './useConfirm'

const ConfirmModal = memo(function ConfirmModal() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ConfirmOptions
      setOpts(detail)
    }
    window.addEventListener('app-confirm', handler)
    return () => window.removeEventListener('app-confirm', handler)
  }, [])

  const close = (result: boolean) => {
    const entry = queue.shift()
    if (entry) entry.resolve(result)
    if (queue.length > 0) {
      setOpts(queue[0].options)
    } else {
      setOpts(null)
    }
  }

  if (!opts) return null

  return (
    <div className="confirm-modal" role="presentation">
      <div className="confirm-modal-bg" onClick={() => close(false)} />
      <div className="confirm-modal-box" role="dialog" aria-modal="true" aria-label="确认操作">
        <p>{opts.message}</p>
        <div className="confirm-modal-actions">
          <button className="btn-cancel" aria-label="取消" onClick={() => close(false)}>
            {opts.cancelLabel ?? '取消'}
          </button>
          <button
            className={opts.danger !== false ? 'btn-danger' : 'btn-cancel'}
            aria-label="确认"
            onClick={() => close(true)}
          >
            {opts.confirmLabel ?? '确定'}
          </button>
        </div>
      </div>
    </div>
  )
})

export default ConfirmModal
