import { useEffect } from 'react'
import { UndoManager } from 'undo-manager'

interface UseUndoManagerOptions {
  onUndo?: () => void
  onRedo?: () => void
  onChange?: (state: any) => void
  maxHistory?: number
}

export function useUndoManager(options: UseUndoManagerOptions = {}) {
  const { onUndo, onRedo, onChange, maxHistory = 50 } = options

  useEffect(() => {
    const undoManager = new UndoManager()
    undoManager.setLimit(maxHistory)

    // 监听撤销/重做事件
    undoManager.on('undo', () => {
      onUndo?.()
      const state = undoManager.getState()
      onChange?.(state)
    })

    undoManager.on('redo', () => {
      onRedo?.()
      const state = undoManager.getState()
      onChange?.(state)
    })

    return () => {
      undoManager.clear()
    }
  }, [onUndo, onRedo, onChange, maxHistory])

  return {
    // 返回控制函数，实际使用需要结合状态管理
    canUndo: false,
    canRedo: false,
  }
}
