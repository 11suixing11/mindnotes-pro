import { useEffect, useCallback } from 'react'
import { useEraserStore } from './eraserStore'
import type { EraserShape, EraserPresetType } from './types'

/**
 * 橡皮擦键盘快捷键
 * 
 * 快捷键清单:
 * 1 → 圆形橡皮擦
 * 2 → 方形橡皮擦
 * 3 → 凿形橡皮擦
 * Q → 2B 硬橡皮
 * W → 4B 中性橡皮
 * E → 6B 软橡皮
 * R → 削橡皮（重置磨损）
 * M → 开关音效
 * [ → 减小橡皮擦
 * ] → 增大橡皮擦
 */

const SHAPE_SHORTCUTS: Record<string, EraserShape> = {
  '1': 'circle',
  '2': 'square',
  '3': 'chisel',
}

const PRESET_SHORTCUTS: Record<string, EraserPresetType> = {
  'q': '2b',
  'Q': '2b',
  'w': '4b',
  'W': '4b',
  'e': '6b',
  'E': '6b',
}

export function useEraserKeyboardShortcuts() {
  const { updateEraserConfig, setEraserPreset, resetWear } = useEraserStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 忽略输入框中的按键
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // 形状切换: 1/2/3
    if (SHAPE_SHORTCUTS[e.key]) {
      e.preventDefault()
      updateEraserConfig({ shape: SHAPE_SHORTCUTS[e.key] })
      return
    }

    // 预设切换: Q/W/E
    if (PRESET_SHORTCUTS[e.key]) {
      e.preventDefault()
      setEraserPreset(PRESET_SHORTCUTS[e.key])
      return
    }

    // 削橡皮: R
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault()
      resetWear()
      return
    }

    // 开关音效: M
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      const { eraserConfig } = useEraserStore.getState()
      updateEraserConfig({ audioEnabled: !eraserConfig.audioEnabled })
      return
    }

    // 减小橡皮擦: [
    if (e.key === '[') {
      e.preventDefault()
      const { eraserConfig } = useEraserStore.getState()
      const newRadius = Math.max(4, (eraserConfig.baseRadius ?? 12) - 2)
      updateEraserConfig({ baseRadius: newRadius })
      return
    }

    // 增大橡皮擦: ]
    if (e.key === ']') {
      e.preventDefault()
      const { eraserConfig } = useEraserStore.getState()
      const newRadius = Math.min(40, (eraserConfig.baseRadius ?? 12) + 2)
      updateEraserConfig({ baseRadius: newRadius })
      return
    }
  }, [updateEraserConfig, setEraserPreset, resetWear])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// 快捷键提示数据
export const ERASER_SHORTCUTS_INFO = [
  { key: '1', action: '圆形橡皮擦' },
  { key: '2', action: '方形橡皮擦' },
  { key: '3', action: '凿形橡皮擦' },
  { key: 'Q', action: '2B 硬橡皮' },
  { key: 'W', action: '4B 中性橡皮' },
  { key: 'E', action: '6B 软橡皮' },
  { key: 'R', action: '削橡皮' },
  { key: 'M', action: '开关音效' },
  { key: '[ ]', action: '调整大小' },
]
