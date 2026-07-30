import { useViewStore } from '../../store/useViewStore'

export function getMainCanvas(): HTMLCanvasElement | null {
  return document.getElementById('main-canvas') as HTMLCanvasElement | null
}

export function getVisibleCanvasViewport(canvas: HTMLCanvasElement | null) {
  const viewBox = useViewStore.getState().viewBox
  if (!canvas) {
    const width = window.innerWidth || 1024
    const height = window.innerHeight || 768
    return {
      width,
      height,
      centerX: viewBox.x + width / 2 / viewBox.zoom,
      centerY: viewBox.y + height / 2 / viewBox.zoom,
    }
  }

  const rect = canvas.getBoundingClientRect()
  const left = Math.max(rect.left, 0)
  const top = Math.max(rect.top, 0)
  const right = Math.min(rect.right, window.innerWidth || rect.right)
  const bottom = Math.min(rect.bottom, window.innerHeight || rect.bottom)
  const visibleWidth = Math.max(0, right - left)
  const visibleHeight = Math.max(0, bottom - top)
  const screenX = visibleWidth > 0 ? left + visibleWidth / 2 : (window.innerWidth || rect.width) / 2
  const screenY =
    visibleHeight > 0 ? top + visibleHeight / 2 : (window.innerHeight || rect.height) / 2

  return {
    width: visibleWidth || rect.width || window.innerWidth || 1024,
    height: visibleHeight || rect.height || window.innerHeight || 768,
    centerX: viewBox.x + (screenX - rect.left) / viewBox.zoom,
    centerY: viewBox.y + (screenY - rect.top) / viewBox.zoom,
  }
}
