import { useEffect, useRef } from 'react'
import { findShortcutAction, isEditableShortcutTarget } from '../../keyboard/shortcuts'
import { useShortcutStore } from '../../store/useShortcutStore'
import {
  executeShortcutAction,
  handleEscapeShortcut,
  handleKeyboardNudge,
  handleQuickColorShortcut,
  type KeyboardBindingOptions,
} from './keyboardShortcutActions'

export function useKeyboardBindings(options: KeyboardBindingOptions = {}) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableShortcutTarget(e.target)) return

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
