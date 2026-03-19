import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

export interface ShortcutConfig {
  key: string
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[]
  action: string
  description: string
  category: '工具' | '编辑' | '视图' | '文件' | '帮助'
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // 工具
  { key: '1', action: 'tool:pen', description: '选择笔工具', category: '工具' },
  { key: '2', action: 'tool:eraser', description: '选择橡皮', category: '工具' },
  { key: '3', action: 'tool:pan', description: '选择平移工具', category: '工具' },
  { key: '4', action: 'tool:rectangle', description: '选择矩形工具', category: '工具' },
  { key: '5', action: 'tool:circle', description: '选择圆形工具', category: '工具' },
  { key: '6', action: 'tool:triangle', description: '选择三角形工具', category: '工具' },
  { key: '7', action: 'tool:line', description: '选择直线工具', category: '工具' },
  { key: '8', action: 'tool:arrow', description: '选择箭头工具', category: '工具' },
  
  // 编辑
  { key: 'z', modifiers: ['ctrl'], action: 'edit:undo', description: '撤销', category: '编辑' },
  { key: 'z', modifiers: ['ctrl', 'shift'], action: 'edit:redo', description: '重做', category: '编辑' },
  { key: 'delete', action: 'edit:clear', description: '清空画布', category: '编辑' },
  
  // 视图
  { key: '+', action: 'view:zoomIn', description: '放大', category: '视图' },
  { key: '=', action: 'view:zoomIn', description: '放大', category: '视图' },
  { key: '-', action: 'view:zoomOut', description: '缩小', category: '视图' },
  { key: '0', action: 'view:reset', description: '重置视图', category: '视图' },
  { key: ' ', modifiers: ['shift'], action: 'view:toggleGuides', description: '切换辅助线', category: '视图' },
  { key: 'g', action: 'view:toggleGrid', description: '切换网格吸附', category: '视图' },
  
  // 文件
  { key: 's', modifiers: ['ctrl'], action: 'file:save', description: '保存笔记', category: '文件' },
  
  // 帮助
  { key: '?', action: 'help:shortcuts', description: '查看快捷键', category: '帮助' },
]

export function useShortcuts() {
  const { 
    setTool, undo, clearStrokes, zoomIn, zoomOut, resetView,
    toggleShowGuides, toggleSnapToGrid
  } = useAppStore()

  const executeAction = useCallback((action: string) => {
    const command = action.split(':')[1]
    
    switch (command) {
      case 'pen':
      case 'eraser':
      case 'pan':
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'line':
      case 'arrow':
        setTool(command as any)
        break
      case 'undo':
        undo()
        break
      case 'clear':
        if (confirm('确定要清空所有笔迹吗？')) {
          clearStrokes()
        }
        break
      case 'zoomIn':
        zoomIn()
        break
      case 'zoomOut':
        zoomOut()
        break
      case 'reset':
        resetView()
        break
      case 'toggleGuides':
        toggleShowGuides()
        break
      case 'toggleGrid':
        toggleSnapToGrid()
        break
      case 'save':
        window.dispatchEvent(new CustomEvent('mindnotes-save'))
        break
      case 'shortcuts':
        window.dispatchEvent(new CustomEvent('toggle-shortcuts'))
        break
    }
  }, [setTool, undo, clearStrokes, zoomIn, zoomOut, resetView, toggleShowGuides, toggleSnapToGrid])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // 特殊处理：? 键（需要 Shift+/）
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        executeAction('help:shortcuts')
        return
      }

      // 查找匹配的快捷键
      const shortcut = DEFAULT_SHORTCUTS.find(s => {
        if (s.key.toLowerCase() !== e.key.toLowerCase()) return false
        
        const hasCtrl = e.ctrlKey || e.metaKey
        const hasShift = e.shiftKey
        const hasAlt = e.altKey
        
        const needCtrl = s.modifiers?.includes('ctrl') || s.modifiers?.includes('meta')
        const needShift = s.modifiers?.includes('shift')
        const needAlt = s.modifiers?.includes('alt')
        
        if (needCtrl && !hasCtrl) return false
        if (needShift && !hasShift) return false
        if (needAlt && !hasAlt) return false
        
        return true
      })

      if (shortcut) {
        e.preventDefault()
        executeAction(shortcut.action)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [executeAction])

  return {
    shortcuts: DEFAULT_SHORTCUTS,
    executeAction,
  }
}
