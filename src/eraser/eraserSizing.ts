import { useEraserStore } from './eraserStore'
import { DEFAULT_ERASER_CONFIG } from './types'

export function getActiveEraserRadius(): number {
  const radius = useEraserStore.getState().eraserConfig.baseRadius
  return Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_ERASER_CONFIG.baseRadius
}
