import { useEffect } from 'react'

interface ShortcutConfig {
  key: string
  modifiers?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
  action: (e: KeyboardEvent) => void
  preventDefault?: boolean
  stopPropagation?: boolean
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const { key, modifiers, action, preventDefault = true, stopPropagation = true } = shortcut
        
        // 检查修饰键
        const ctrlMatch = modifiers?.ctrl ? e.ctrlKey : !e.ctrlKey
        const shiftMatch = modifiers?.shift ? e.shiftKey : !e.shiftKey
        const altMatch = modifiers?.alt ? e.altKey : !e.altKey
        const metaMatch = modifiers?.meta ? e.metaKey : !e.metaKey
        
        // 检查主键
        const keyMatch = e.key.toLowerCase() === key.toLowerCase()
        
        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (preventDefault) {
            e.preventDefault()
          }
          if (stopPropagation) {
            e.stopPropagation()
          }
          action(e)
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// 预设快捷键配置
export function useDefaultShortcuts(actions: {
  onSave?: () => void
  onNew?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onCommandPalette?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleGrid?: () => void
  onToggleTheme?: () => void
}) {
  const shortcuts: ShortcutConfig[] = [
    // 保存
    {
      key: 's',
      modifiers: { ctrl: true },
      action: () => actions.onSave?.(),
    },
    
    // 新建
    {
      key: 'n',
      modifiers: { ctrl: true },
      action: () => actions.onNew?.(),
    },
    
    // 撤销
    {
      key: 'z',
      modifiers: { ctrl: true },
      action: () => actions.onUndo?.(),
    },
    
    // 重做
    {
      key: 'z',
      modifiers: { ctrl: true, shift: true },
      action: () => actions.onRedo?.(),
    },
    
    // 命令面板
    {
      key: 'p',
      modifiers: { ctrl: true },
      action: () => actions.onCommandPalette?.(),
    },
    {
      key: 'p',
      modifiers: { meta: true }, // Mac Cmd+P
      action: () => actions.onCommandPalette?.(),
    },
    
    // 放大
    {
      key: '=',
      modifiers: { ctrl: true },
      action: () => actions.onZoomIn?.(),
    },
    {
      key: '+',
      modifiers: { ctrl: true, shift: true },
      action: () => actions.onZoomIn?.(),
    },
    
    // 缩小
    {
      key: '-',
      modifiers: { ctrl: true },
      action: () => actions.onZoomOut?.(),
    },
  ]

  useKeyboardShortcuts(shortcuts)
}

// 命令面板快捷键
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P 或 Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpen])
}
