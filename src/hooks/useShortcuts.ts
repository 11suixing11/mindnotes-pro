/**
 * 快捷键配置数据（供 ShortcutsPanel 显示）
 * 实际注册在 useMindNotesHotkeys.ts
 */

export interface ShortcutConfig {
  key: string
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[]
  action: string
  description: string
  category: '工具' | '编辑' | '视图' | '文件' | '帮助'
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // 工具
  { key: 'v', action: 'tool:select', description: '选择工具', category: '工具' },
  { key: '1', action: 'tool:pen', description: '选择笔工具', category: '工具' },
  { key: '2', action: 'tool:eraser', description: '选择橡皮', category: '工具' },
  { key: '3', action: 'tool:pan', description: '选择平移工具', category: '工具' },
  { key: 't', action: 'tool:text', description: '选择文字工具', category: '工具' },
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
  { key: 'g', action: 'view:toggleGrid', description: '切换网格吸附', category: '视图' },

  // 文件
  { key: 's', modifiers: ['ctrl'], action: 'file:save', description: '保存笔记', category: '文件' },

  // 帮助
  { key: '?', action: 'help:shortcuts', description: '查看快捷键', category: '帮助' },
]

export function useShortcuts() {
  return { shortcuts: DEFAULT_SHORTCUTS }
}
