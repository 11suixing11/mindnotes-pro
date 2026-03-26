import type { Command } from './types'

/**
 * 命令注册表
 * 集中管理所有可用命令
 */
export function getCommands(dependencies: {
  onNewNote?: () => void
  onSave?: () => void
  onClearCanvas?: () => void
  onInsertText?: () => void
  onInsertShape?: () => void
  onInsertImage?: () => void
  onToggleLayers?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetView?: () => void
  onExportPNG?: () => void
  onExportSVG?: () => void
  onExportPDF?: () => void
  onAIAnalyze?: () => void
}): Command[] {
  const {
    onNewNote,
    onSave,
    onClearCanvas,
    onInsertText,
    onInsertShape,
    onInsertImage,
    onToggleLayers,
    onZoomIn,
    onZoomOut,
    onResetView,
    onExportPNG,
    onExportSVG,
    onExportPDF,
    onAIAnalyze,
  } = dependencies

  return [
    // 操作类
    {
      id: 'new-note',
      name: '新建笔记',
      shortcut: 'Ctrl+N',
      icon: '📝',
      category: 'action',
      keywords: ['新建', '创建', 'note', 'new'],
      action: onNewNote || (() => {}),
    },
    {
      id: 'save-note',
      name: '保存笔记',
      shortcut: 'Ctrl+S',
      icon: '💾',
      category: 'action',
      keywords: ['保存', 'save'],
      action: onSave || (() => {}),
    },
    {
      id: 'clear-canvas',
      name: '清空画布',
      shortcut: '',
      icon: '🗑️',
      category: 'action',
      keywords: ['清空', '清除', 'clear', 'delete'],
      action: onClearCanvas || (() => {}),
    },

    // 插入类
    {
      id: 'insert-text',
      name: '插入文本框',
      shortcut: 'T',
      icon: 'T',
      category: 'insert',
      keywords: ['文本', '文字', 'text'],
      action: onInsertText || (() => {}),
    },
    {
      id: 'insert-shape',
      name: '插入形状',
      shortcut: 'R',
      icon: '⬜',
      category: 'insert',
      keywords: ['形状', '图形', 'shape', 'rectangle'],
      action: onInsertShape || (() => {}),
    },
    {
      id: 'insert-image',
      name: '插入图片',
      shortcut: 'Ctrl+I',
      icon: '🖼️',
      category: 'insert',
      keywords: ['图片', '图像', 'image', 'photo'],
      action: onInsertImage || (() => {}),
    },

    // 视图类
    {
      id: 'toggle-layers',
      name: '图层面板',
      shortcut: 'L',
      icon: '📑',
      category: 'view',
      keywords: ['图层', 'layers'],
      action: onToggleLayers || (() => {}),
    },
    {
      id: 'zoom-in',
      name: '放大',
      shortcut: 'Ctrl++',
      icon: '🔍+',
      category: 'view',
      keywords: ['放大', 'zoom', 'in'],
      action: onZoomIn || (() => {}),
    },
    {
      id: 'zoom-out',
      name: '缩小',
      shortcut: 'Ctrl+-',
      icon: '🔍-',
      category: 'view',
      keywords: ['缩小', 'zoom', 'out'],
      action: onZoomOut || (() => {}),
    },
    {
      id: 'reset-view',
      name: '重置视图',
      shortcut: 'Ctrl+0',
      icon: '1:1',
      category: 'view',
      keywords: ['重置', 'reset', 'view'],
      action: onResetView || (() => {}),
    },

    // 导出类
    {
      id: 'export-png',
      name: '导出为 PNG',
      shortcut: '',
      icon: '📤',
      category: 'export',
      keywords: ['导出', 'export', 'png', 'image'],
      action: onExportPNG || (() => {}),
    },
    {
      id: 'export-svg',
      name: '导出为 SVG',
      shortcut: '',
      icon: '📤',
      category: 'export',
      keywords: ['导出', 'export', 'svg', 'vector'],
      action: onExportSVG || (() => {}),
    },
    {
      id: 'export-pdf',
      name: '导出为 PDF',
      shortcut: '',
      icon: '📄',
      category: 'export',
      keywords: ['导出', 'export', 'pdf', 'document'],
      action: onExportPDF || (() => {}),
    },

    // AI 类
    {
      id: 'ai-analyze',
      name: 'AI 智能分析',
      shortcut: 'Ctrl+Shift+A',
      icon: '🤖',
      category: 'ai',
      keywords: ['AI', '分析', 'analyze', '智能'],
      action: onAIAnalyze || (() => {}),
    },
  ]
}

/**
 * 搜索命令
 * 支持模糊匹配名称和关键词
 */
export function searchCommands(query: string, commands: Command[]): Command[] {
  if (!query.trim()) return commands

  const normalizedQuery = query.toLowerCase().trim()

  return commands.filter((cmd) => {
    const nameMatch = cmd.name.toLowerCase().includes(normalizedQuery)
    const keywordMatch = cmd.keywords?.some((kw) =>
      kw.toLowerCase().includes(normalizedQuery)
    )
    const shortcutMatch = cmd.shortcut?.toLowerCase().includes(normalizedQuery)

    return nameMatch || keywordMatch || shortcutMatch
  })
}
