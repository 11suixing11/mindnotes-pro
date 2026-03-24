import type { CommandDescriptor } from './types'

export const defaultCommands: CommandDescriptor[] = [
  { id: 'tool.pen', description: '选择笔工具', category: 'tool' },
  { id: 'tool.eraser', description: '选择橡皮工具', category: 'tool' },
  { id: 'tool.pan', description: '选择平移工具', category: 'tool' },
  { id: 'tool.rectangle', description: '选择矩形工具', category: 'tool' },
  { id: 'tool.circle', description: '选择圆形工具', category: 'tool' },
  { id: 'tool.triangle', description: '选择三角形工具', category: 'tool' },
  { id: 'tool.line', description: '选择直线工具', category: 'tool' },
  { id: 'tool.arrow', description: '选择箭头工具', category: 'tool' },
  { id: 'edit.undo', description: '撤销', category: 'edit' },
  { id: 'edit.redo', description: '重做', category: 'edit' },
  { id: 'edit.clear', description: '清空画布', category: 'edit' },
  { id: 'view.zoomIn', description: '放大视图', category: 'view' },
  { id: 'view.zoomOut', description: '缩小视图', category: 'view' },
  { id: 'view.reset', description: '重置视图', category: 'view' },
  { id: 'view.toggleGuides', description: '切换辅助线', category: 'view' },
  { id: 'view.toggleGrid', description: '切换网格吸附', category: 'view' },
  { id: 'file.save', description: '保存笔记', category: 'file' },
  { id: 'ui.toggleLayersPanel', description: '切换图层面板', category: 'ui' },
  { id: 'help.shortcuts', description: '显示快捷键帮助', category: 'help' },
]
