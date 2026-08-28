import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const MENU_ITEM_SELECTOR =
  '[role="menuitem"]:not([disabled]), [role="menuitemradio"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])'

const focusScopeStack: HTMLElement[] = []

function getTopFocusScope(): HTMLElement | undefined {
  while (focusScopeStack.length > 0 && !focusScopeStack[focusScopeStack.length - 1]?.isConnected) {
    focusScopeStack.pop()
  }
  return focusScopeStack[focusScopeStack.length - 1]
}

interface UseDialogFocusOptions {
  open: boolean
  onClose: () => void
  /** Optional portal-mounted container that belongs to the same focus scope. */
  additionalRef?: RefObject<HTMLElement | null>
}

/** Keep keyboard focus inside an open dialog and return it to the trigger on close. */
export function useDialogFocus<T extends HTMLElement>({
  open,
  onClose,
  additionalRef,
}: UseDialogFocusOptions): RefObject<T | null> {
  const dialogRef = useRef<T>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    // Focus is captured when the surface opens and restored from the effect
    // cleanup.  Cleanup also runs when a portal is conditionally unmounted
    // (for example, a context menu), not only when `open` changes to false.
    // Keeping the restoration here makes all callers share the same lifecycle
    // regardless of whether they keep an overlay mounted while it is closed.
    if (!open) return

    const focusScope = dialogRef.current
    if (!focusScope) return
    focusScopeStack.push(focusScope)

    const activeElement = document.activeElement
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null
    const focusTimer = window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(firstFocusable ?? dialogRef.current)?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      if (getTopFocusScope() !== focusScope) return

      const active = document.activeElement
      const activeMenu =
        active instanceof HTMLElement ? active.closest<HTMLElement>('[role="menu"]') : null
      const activeMenuInScope =
        activeMenu &&
        (focusScope.contains(activeMenu) || additionalRef?.current?.contains(activeMenu))

      if (activeMenuInScope && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = Array.from(activeMenu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
        if (items.length === 0) return
        event.preventDefault()
        const currentIndex = items.indexOf(active as HTMLElement)
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : event.key === 'ArrowDown'
                ? (currentIndex + 1 + items.length) % items.length
                : currentIndex < 0
                  ? items.length - 1
                  : (currentIndex - 1 + items.length) % items.length
        items[nextIndex]?.focus()
        return
      }

      if (
        activeMenuInScope &&
        event.key === 'ArrowRight' &&
        active instanceof HTMLElement &&
        active.getAttribute('aria-haspopup') === 'menu'
      ) {
        event.preventDefault()
        active.click()
        return
      }

      if (
        activeMenuInScope &&
        event.key === 'ArrowLeft' &&
        activeMenu !== focusScope &&
        additionalRef?.current?.contains(activeMenu)
      ) {
        const expandedTrigger = focusScope.querySelector<HTMLElement>(
          '[aria-haspopup="menu"][aria-expanded="true"]'
        )
        if (expandedTrigger) {
          event.preventDefault()
          expandedTrigger.click()
          expandedTrigger.focus()
          return
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [dialogRef.current, additionalRef?.current]
        .filter((container): container is HTMLElement => container instanceof HTMLElement)
        .flatMap((container) =>
          Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        )
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeInScope = [dialogRef.current, additionalRef?.current].some((container) =>
        container?.contains(active)
      )
      if (!activeInScope) {
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
      const scopeIndex = focusScopeStack.lastIndexOf(focusScope)
      if (scopeIndex >= 0) focusScopeStack.splice(scopeIndex, 1)
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (previousFocus?.isConnected) queueMicrotask(() => previousFocus.focus())
    }
  }, [additionalRef, open])

  return dialogRef
}
