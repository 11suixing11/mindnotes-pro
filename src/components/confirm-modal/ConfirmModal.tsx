import { useCallback, useEffect, memo, useState } from 'react'
import type { ConfirmOptions } from './useConfirm'
import { queue } from './useConfirm'
import { useDialogFocus } from '../useDialogFocus'

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

  const close = useCallback((result: boolean) => {
    const entry = queue.shift()
    if (entry) entry.resolve(result)
    if (queue.length > 0) {
      setOpts(queue[0].options)
    } else {
      setOpts(null)
    }
  }, [])

  const dialogRef = useDialogFocus<HTMLDivElement>({
    open: opts !== null,
    onClose: () => close(false),
  })

  if (!opts) return null

  return (
    <div className="confirm-modal" role="presentation" data-modal-layer="true">
      <div className="confirm-modal-bg" aria-hidden="true" onClick={() => close(false)} />
      <div
        ref={dialogRef}
        className="confirm-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        tabIndex={-1}
      >
        <h2 id="confirm-modal-title" className="sr-only">
          确认操作
        </h2>
        <p id="confirm-modal-message">{opts.message}</p>
        <div className="confirm-modal-actions">
          <button
            className="btn-cancel"
            aria-label={opts.cancelLabel ?? '取消'}
            onClick={() => close(false)}
          >
            {opts.cancelLabel ?? '取消'}
          </button>
          <button
            className={opts.danger !== false ? 'btn-danger' : 'btn-cancel'}
            aria-label={opts.confirmLabel ?? '确定'}
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
