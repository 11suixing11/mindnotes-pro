import { useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import type { CanvasElement } from '../../store/types'

export function useSelectionEngine(
  cachedBounds: (el: CanvasElement) => { x: number; y: number; w: number; h: number }
) {
  const snapLinesRef = useRef<{ x: number[]; y: number[] }>({ x: [], y: [] })

  function findSnaps(
    movingBounds: { x: number; y: number; w: number; h: number },
    excludeIds: Set<string>
  ): { dx: number; dy: number; linesX: number[]; linesY: number[] } {
    const SNAP_THRESHOLD = 6 / (useViewStore.getState().viewBox.zoom || 1)
    const state = useAppStore.getState()
    const els = state.elements
    const movingEdges = {
      left: movingBounds.x,
      right: movingBounds.x + movingBounds.w,
      top: movingBounds.y,
      bottom: movingBounds.y + movingBounds.h,
      cx: movingBounds.x + movingBounds.w / 2,
      cy: movingBounds.y + movingBounds.h / 2,
    }
    let bestDx = 0,
      bestDy = 0,
      bestDistX = SNAP_THRESHOLD,
      bestDistY = SNAP_THRESHOLD
    const linesX: number[] = [],
      linesY: number[] = []

    // P1 性能优化: 使用空间索引缩小对齐检测范围
    // 只检测移动边界附近的元素，而非全部元素
    const expand = SNAP_THRESHOLD * 2 + Math.max(movingBounds.w, movingBounds.h)
    const nearIds = state.spatialIndex?.search({
      x: movingBounds.x - expand,
      y: movingBounds.y - expand,
      w: movingBounds.w + expand * 2,
      h: movingBounds.h + expand * 2,
    })

    // 使用候选集或降级到全量遍历
    const candidateSet = nearIds ? new Set(nearIds) : null

    for (const el of els) {
      if (excludeIds.has(el.id)) continue
      // P1 优化: 跳过不在候选集中的元素
      if (candidateSet && !candidateSet.has(el.id)) continue

      const b = cachedBounds(el)
      const oe = {
        left: b.x,
        right: b.x + b.w,
        top: b.y,
        bottom: b.y + b.h,
        cx: b.x + b.w / 2,
        cy: b.y + b.h / 2,
      }
      for (const mv of [movingEdges.left, movingEdges.right, movingEdges.cx]) {
        for (const ot of [oe.left, oe.right, oe.cx]) {
          const d = Math.abs(mv - ot)
          if (d < bestDistX) {
            bestDistX = d
            bestDx = ot - mv
          }
        }
      }
      for (const mv of [movingEdges.top, movingEdges.bottom, movingEdges.cy]) {
        for (const ot of [oe.top, oe.bottom, oe.cy]) {
          const d = Math.abs(mv - ot)
          if (d < bestDistY) {
            bestDistY = d
            bestDy = ot - mv
          }
        }
      }
    }
    if (bestDistX < SNAP_THRESHOLD) {
      const sx = movingBounds.x + bestDx
      linesX.push(sx, sx + movingBounds.w, sx + movingBounds.w / 2)
    } else {
      bestDx = 0
    }
    if (bestDistY < SNAP_THRESHOLD) {
      const sy = movingBounds.y + bestDy
      linesY.push(sy, sy + movingBounds.h, sy + movingBounds.h / 2)
    } else {
      bestDy = 0
    }

    // Update snapLinesRef with the calculated lines
    snapLinesRef.current = { x: linesX, y: linesY }

    return { dx: bestDx, dy: bestDy, linesX, linesY }
  }

  return { findSnaps, snapLinesRef }
}
