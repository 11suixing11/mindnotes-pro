import type { StyleCommandResult } from '../../store/slices/toolSettings'

export function getStyleCommandMessage(result: StyleCommandResult): string | null {
  if (result.status !== 'blocked') return null
  if (result.reason === 'locked-selection') {
    return '所选内容包含锁定对象，未修改任何样式'
  }
  if (result.reason === 'incompatible') {
    return '所选内容没有可共同修改的这项样式'
  }
  return null
}
