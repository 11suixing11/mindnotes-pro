import { useCallback } from 'react'

export interface ConfirmOptions {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (message: string, options?: Partial<ConfirmOptions>) => Promise<boolean>

export interface QueueEntry {
  resolve: (v: boolean) => void
  options: ConfirmOptions
}

export const queue: QueueEntry[] = []

export function useConfirm(): ConfirmFn {
  return useCallback((message: string, options?: Partial<ConfirmOptions>) => {
    return new Promise<boolean>((resolve) => {
      const entry: QueueEntry = {
        resolve,
        options: {
          message,
          confirmLabel: options?.confirmLabel,
          cancelLabel: options?.cancelLabel,
          danger: options?.danger,
        },
      }
      queue.push(entry)
      if (queue.length === 1) {
        window.dispatchEvent(new CustomEvent('app-confirm', { detail: entry.options }))
      }
    })
  }, [])
}
