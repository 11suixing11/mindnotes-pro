import { useCallback, useEffect, useRef } from 'react'
import { findShortcutAction, isInteractiveShortcutTarget } from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'
import { requestClearCanvas } from '../confirm-modal/requestClearCanvas'
import { useConfirm } from '../confirm-modal/useConfirm'
import {
  executeShortcutAction,
  handleEscapeShortcut,
  handleKeyboardNudge,
  handleQuickColorShortcut,
  type KeyboardBindingOptions,
} from './keyboardShortcutActions'

export function useKeyboardBindings(options: KeyboardBindingOptions = {}) {
  const confirm = useConfirm()
  const requestClear = useCallback(
    (elementCount: number, clearAll: () => boolean) =>
      requestClearCanvas(elementCount, confirm, clearAll),
    [confirm]
  )
  const optionsRef = useRef(options)
  optionsRef.current = {
    ...options,
    requestClearCanvas: options.requestClearCanvas ?? requestClear,
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInteractiveShortcutTarget(e.target)) return

      if (handleEscapeShortcut(e)) return

      const action = findShortcutAction(e, useShortcutStore.getState().bindings)
      if (action && executeShortcutAction(action, e, optionsRef)) return

      if (handleQuickColorShortcut(e)) return
      if (handleKeyboardNudge(e)) return
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
