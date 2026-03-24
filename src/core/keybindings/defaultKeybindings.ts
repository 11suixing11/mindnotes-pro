import type { Keybinding } from './types'

export const defaultKeybindings: Keybinding[] = [
  { id: 'tool.pen', commandId: 'tool.pen', key: '1', description: '选择笔工具' },
  { id: 'tool.eraser', commandId: 'tool.eraser', key: '2', description: '选择橡皮工具' },
  { id: 'tool.pan', commandId: 'tool.pan', key: '3', description: '选择平移工具' },
  { id: 'tool.rectangle', commandId: 'tool.rectangle', key: '4', description: '选择矩形工具' },
  { id: 'tool.circle', commandId: 'tool.circle', key: '5', description: '选择圆形工具' },
  { id: 'tool.triangle', commandId: 'tool.triangle', key: '6', description: '选择三角形工具' },
  { id: 'tool.line', commandId: 'tool.line', key: '7', description: '选择直线工具' },
  { id: 'tool.arrow', commandId: 'tool.arrow', key: '8', description: '选择箭头工具' },

  { id: 'edit.undo.win', commandId: 'edit.undo', key: 'z', modifiers: ['ctrl'], platform: 'windows', description: '撤销' },
  { id: 'edit.undo.linux', commandId: 'edit.undo', key: 'z', modifiers: ['ctrl'], platform: 'linux', description: '撤销' },
  { id: 'edit.undo.mac', commandId: 'edit.undo', key: 'z', modifiers: ['meta'], platform: 'mac', description: '撤销' },

  { id: 'edit.redo.win', commandId: 'edit.redo', key: 'z', modifiers: ['ctrl', 'shift'], platform: 'windows', description: '重做' },
  { id: 'edit.redo.linux', commandId: 'edit.redo', key: 'z', modifiers: ['ctrl', 'shift'], platform: 'linux', description: '重做' },
  { id: 'edit.redo.mac', commandId: 'edit.redo', key: 'z', modifiers: ['meta', 'shift'], platform: 'mac', description: '重做' },

  { id: 'edit.clear.delete', commandId: 'edit.clear', key: 'delete', description: '清空画布' },
  { id: 'edit.clear.backspace', commandId: 'edit.clear', key: 'backspace', description: '清空画布' },

  { id: 'view.zoomIn.equal', commandId: 'view.zoomIn', key: '=', description: '放大视图' },
  { id: 'view.zoomIn.plus', commandId: 'view.zoomIn', key: '+', modifiers: ['shift'], description: '放大视图' },
  { id: 'view.zoomOut', commandId: 'view.zoomOut', key: '-', description: '缩小视图' },
  { id: 'view.reset', commandId: 'view.reset', key: '0', description: '重置视图' },
  { id: 'view.toggleGuides', commandId: 'view.toggleGuides', key: 'g', modifiers: ['shift'], description: '切换辅助线' },
  { id: 'view.toggleGrid', commandId: 'view.toggleGrid', key: 'g', description: '切换网格吸附' },

  { id: 'file.save.win', commandId: 'file.save', key: 's', modifiers: ['ctrl'], platform: 'windows', description: '保存笔记' },
  { id: 'file.save.linux', commandId: 'file.save', key: 's', modifiers: ['ctrl'], platform: 'linux', description: '保存笔记' },
  { id: 'file.save.mac', commandId: 'file.save', key: 's', modifiers: ['meta'], platform: 'mac', description: '保存笔记' },

  { id: 'ui.toggleLayersPanel.win', commandId: 'ui.toggleLayersPanel', key: 'l', modifiers: ['ctrl', 'shift'], platform: 'windows', description: '切换图层面板' },
  { id: 'ui.toggleLayersPanel.linux', commandId: 'ui.toggleLayersPanel', key: 'l', modifiers: ['ctrl', 'shift'], platform: 'linux', description: '切换图层面板' },
  { id: 'ui.toggleLayersPanel.mac', commandId: 'ui.toggleLayersPanel', key: 'l', modifiers: ['meta', 'shift'], platform: 'mac', description: '切换图层面板' },

  { id: 'help.shortcuts', commandId: 'help.shortcuts', key: '/', modifiers: ['shift'], description: '显示快捷键帮助' },
]
