import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'error' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: string) => void
}

// 连续撤销/重做时每一步都会弹一条通知，不设上限会堆满屏幕遮挡画布。
const MAX_VISIBLE_TOASTS = 4

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, duration }].slice(-MAX_VISIBLE_TOASTS),
    }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
