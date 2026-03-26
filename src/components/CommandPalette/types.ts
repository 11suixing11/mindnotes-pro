// 命令定义
export interface Command {
  id: string
  name: string
  shortcut?: string
  icon?: string
  category: 'action' | 'insert' | 'view' | 'export' | 'ai'
  keywords?: string[]
  action: () => void
}

// 命令分类
export const COMMAND_CATEGORIES = {
  action: { label: '操作', icon: '⚡' },
  insert: { label: '插入', icon: '➕' },
  view: { label: '视图', icon: '👁️' },
  export: { label: '导出', icon: '📤' },
  ai: { label: 'AI', icon: '🤖' },
} as const

// 常用命令模板
export const createCommand = (
  id: string,
  name: string,
  category: Command['category'],
  action: () => void,
  options?: { shortcut?: string; icon?: string; keywords?: string[] }
): Command => ({
  id,
  name,
  category,
  action,
  shortcut: options?.shortcut,
  icon: options?.icon,
  keywords: options?.keywords,
})
