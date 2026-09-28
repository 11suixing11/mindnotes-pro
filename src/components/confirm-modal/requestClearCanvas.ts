import type { ConfirmOptions } from './useConfirm'
import { backgroundNeedsReset } from '../../store/slices/toolSettings'
import { useAppStore } from '../../store/appStore'

type ConfirmFn = (message: string, options?: Partial<ConfirmOptions>) => Promise<boolean>

interface RequestClearCanvasOptions {
  onEmpty?: () => void
  onCleared?: () => void
  /** 默认从 store 判断；也可以显式传入覆盖。 */
  backgroundNeedsReset?: boolean
}

/** Shared confirmation path for every command that clears the whole canvas. */
export async function requestClearCanvas(
  elementCount: number,
  confirm: ConfirmFn,
  clearAll: () => boolean,
  options: RequestClearCanvasOptions = {}
): Promise<boolean> {
  const bgDirty =
    options.backgroundNeedsReset ?? backgroundNeedsReset(useAppStore.getState())
  if (elementCount === 0 && !bgDirty) {
    options.onEmpty?.()
    return false
  }

  const parts: string[] = []
  parts.push(
    elementCount > 0
      ? `确定清空当前画布吗？当前有 ${elementCount} 个元素。`
      : '当前画布没有元素，但背景仍有自定义设置。'
  )
  if (bgDirty) parts.push('画布背景也会一并重置。')

  if (!(await confirm(parts.join('')))) return false

  const cleared = clearAll()
  if (cleared) options.onCleared?.()
  return cleared
}
