import { useState, useCallback, useEffect } from 'react'

interface ConfirmOptions {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (message: string, options?: Partial<ConfirmOptions>) => Promise<boolean>

const queue: ((v: boolean) => void)[] = []

export function useConfirm(): ConfirmFn {
  return useCallback((message: string, options?: Partial<ConfirmOptions>) => {
    return new Promise<boolean>((resolve) => {
      queue.push(resolve)
      if (queue.length === 1) {
        window.dispatchEvent(new CustomEvent('app-confirm', { detail: { message, ...options } }))
      }
    })
  }, [])
}

export default function ConfirmModal() {
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
    setOpts(null)
    const resolve = queue.shift()
    if (resolve) resolve(result)
    if (queue.length > 0) {
      window.dispatchEvent(new CustomEvent('app-confirm', { detail: { message: '' } }))
    }
  }

  if (!opts) return null

  return (
    <div className="confirm-modal">
      <div className="confirm-modal-bg" onClick={() => close(false)} />
      <div className="confirm-modal-box">
        <p>{opts.message}</p>
        <div className="confirm-modal-actions">
          <button className="btn-cancel" onClick={() => close(false)}>{opts.cancelLabel ?? '取消'}</button>
          <button className={opts.danger !== false ? 'btn-danger' : 'btn-cancel'} onClick={() => close(true)}>{opts.confirmLabel ?? '确定'}</button>
        </div>
      </div>
    </div>
  )
}
