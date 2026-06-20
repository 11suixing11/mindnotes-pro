import { useEffect, useCallback } from 'react'
import { useEraserStore } from './eraserStore'

/**
 * 橡皮擦键盘快捷键
 * 
 * 支持用户自定义快捷键配置
 */

export function useEraserKeyboardShortcuts() {
  const { 
    updateEraserConfig, 
    setEraserPreset, 
    resetWear,
    undoWear,
    redoWear,
  } = useEraserStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 忽略输入框中的按键
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // 获取当前快捷键配置
    const shortcuts = useEraserStore.getState().shortcuts
    const key = e.key.toLowerCase()

    // 形状切换
    if (shortcuts.shapeCircle.enabled && shortcuts.shapeCircle.key.toLowerCase() === key) {
      e.preventDefault()
      updateEraserConfig({ shape: 'circle' })
      return
    }
    if (shortcuts.shapeSquare.enabled && shortcuts.shapeSquare.key.toLowerCase() === key) {
      e.preventDefault()
      updateEraserConfig({ shape: 'square' })
      return
    }
    if (shortcuts.shapeChisel.enabled && shortcuts.shapeChisel.key.toLowerCase() === key) {
      e.preventDefault()
      updateEraserConfig({ shape: 'chisel' })
      return
    }

    // 预设切换
    if (shortcuts.preset2b.enabled && shortcuts.preset2b.key.toLowerCase() === key) {
      e.preventDefault()
      setEraserPreset('2b')
      return
    }
    if (shortcuts.preset4b.enabled && shortcuts.preset4b.key.toLowerCase() === key) {
      e.preventDefault()
      setEraserPreset('4b')
      return
    }
    if (shortcuts.preset6b.enabled && shortcuts.preset6b.key.toLowerCase() === key) {
      e.preventDefault()
      setEraserPreset('6b')
      return
    }

    // 操作
    if (shortcuts.resetWear.enabled && shortcuts.resetWear.key.toLowerCase() === key) {
      e.preventDefault()
      resetWear()
      return
    }
    if (shortcuts.toggleAudio.enabled && shortcuts.toggleAudio.key.toLowerCase() === key) {
      e.preventDefault()
      const { eraserConfig } = useEraserStore.getState()
      updateEraserConfig({ audioEnabled: !eraserConfig.audioEnabled })
      return
    }
    if (shortcuts.undoWear.enabled && shortcuts.undoWear.key.toLowerCase() === key) {
      e.preventDefault()
      undoWear()
      return
    }
    if (shortcuts.redoWear.enabled && shortcuts.redoWear.key.toLowerCase() === key) {
      e.preventDefault()
      redoWear()
      return
    }

    // 大小调整
    if (shortcuts.sizeDecrease.enabled && shortcuts.sizeDecrease.key === e.key) {
      e.preventDefault()
      const { eraserConfig } = useEraserStore.getState()
      const newRadius = Math.max(4, (eraserConfig.baseRadius ?? 12) - 2)
      updateEraserConfig({ baseRadius: newRadius })
      return
    }
    if (shortcuts.sizeIncrease.enabled && shortcuts.sizeIncrease.key === e.key) {
      e.preventDefault()
      const { eraserConfig } = useEraserStore.getState()
      const newRadius = Math.min(40, (eraserConfig.baseRadius ?? 12) + 2)
      updateEraserConfig({ baseRadius: newRadius })
      return
    }
  }, [updateEraserConfig, setEraserPreset, resetWear, undoWear, redoWear])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// 快捷键提示数据（从配置动态生成）
export function getShortcutsInfo() {
  const shortcuts = useEraserStore.getState().shortcuts
  return Object.values(shortcuts)
    .filter(s => s.enabled && s.key)
    .map(s => ({ key: s.key.toUpperCase(), action: s.description }))
}
