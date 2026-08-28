import type { ConfirmOptions } from './useConfirm'

type ConfirmFn = (message: string, options?: Partial<ConfirmOptions>) => Promise<boolean>

interface RequestClearCanvasOptions {
  onEmpty?: () => void
  onCleared?: () => void
}

/** Shared confirmation path for every command that clears the whole canvas. */
export async function requestClearCanvas(
  elementCount: number,
  confirm: ConfirmFn,
  clearAll: () => boolean,
  options: RequestClearCanvasOptions = {}
): Promise<boolean> {
  if (elementCount === 0) {
    options.onEmpty?.()
    return false
  }

  if (!(await confirm(`确定清空当前画布吗？当前有 ${elementCount} 个元素。`))) return false

  const cleared = clearAll()
  if (cleared) options.onCleared?.()
  return cleared
}
