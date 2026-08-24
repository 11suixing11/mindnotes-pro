import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface UseDialogFocusOptions {
  open: boolean
  onClose: () => void
}

/** Keep keyboard focus inside an open dialog and return it to the trigger on close. */
export function useDialogFocus<T extends HTMLElement>({
  open,
  onClose,
}: UseDialogFocusOptions): RefObject<T | null> {
  const dialogRef = useRef<T>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (previousFocus?.isConnected) queueMicrotask(() => previousFocus.focus())
      return
    }

    const activeElement = document.activeElement
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null
    const focusTimer = window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(firstFocusable ?? dialogRef.current)?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current
        ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : []
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!dialogRef.current?.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return dialogRef
}
