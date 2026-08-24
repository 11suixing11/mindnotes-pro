import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import { invalidateDrawingCaches } from '../../canvas/canvasDrawing'
import type { ViewBox } from '../../core/viewport'
import { useAppStore } from '../../store/appStore'
import type { CanvasElement } from '../../store/types'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import { CANVAS_INVALIDATED_EVENT } from './renderEvents'

export interface CanvasSize {
  w: number
  h: number
}

type ElementBounds = { x: number; y: number; w: number; h: number }

const MAX_CANVAS_DPR = 2

export function normalizeCanvasMetrics(width: number, height: number, dpr: number) {
  return {
    size: {
      w: Math.max(1, Math.round(Number.isFinite(width) ? width : 1)),
      h: Math.max(1, Math.round(Number.isFinite(height) ? height : 1)),
    },
    dpr: Math.min(MAX_CANVAS_DPR, Math.max(1, Number.isFinite(dpr) ? dpr : 1)),
  }
}

export function preserveViewCenterOnResize(
  viewBox: ViewBox,
  previousSize: CanvasSize,
  nextSize: CanvasSize
): ViewBox {
  const zoom = Math.max(0.01, viewBox.zoom)
  const centerX = viewBox.x + previousSize.w / 2 / zoom
  const centerY = viewBox.y + previousSize.h / 2 / zoom
  return {
    x: centerX - nextSize.w / 2 / zoom,
    y: centerY - nextSize.h / 2 / zoom,
    zoom: viewBox.zoom,
  }
}

export function synchronizeElementBoundsCache(
  currentElements: CanvasElement[],
  previousReferences: Map<string, CanvasElement>,
  previousIds: Set<string>,
  boundsCache: Map<string, ElementBounds>
): Set<string> {
  const currentIds = new Set<string>()

  for (const element of currentElements) {
    currentIds.add(element.id)
    if (previousReferences.get(element.id) !== element) {
      boundsCache.delete(element.id)
    }
    previousReferences.set(element.id, element)
  }

  for (const id of previousIds) {
    if (currentIds.has(id)) continue
    boundsCache.delete(id)
    previousReferences.delete(id)
  }

  return currentIds
}

interface UseCanvasRendererLifecycleOptions {
  containerRef: RefObject<HTMLDivElement | null>
  dprRef: MutableRefObject<number>
  canvasSizeRef: MutableRefObject<CanvasSize>
  canvasSize: CanvasSize
  commitCanvasSize: (size: CanvasSize) => void
  redraw: () => void
  elementsDirtyRef: MutableRefObject<boolean>
  boundsCacheRef: MutableRefObject<Map<string, ElementBounds>>
}

/** Coordinate renderer sizing, redraw scheduling, and invalidation subscriptions. */
export function useCanvasRendererLifecycle(options: UseCanvasRendererLifecycleOptions): () => void {
  const {
    containerRef,
    dprRef,
    canvasSizeRef,
    canvasSize,
    commitCanvasSize,
    redraw,
    elementsDirtyRef,
    boundsCacheRef,
  } = options
  const rafRef = useRef(0)
  const redrawRef = useRef<() => void>(() => {})

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => redrawRef.current())
  }, [])

  useEffect(() => {
    redrawRef.current = redraw
  }, [redraw])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width <= 0 || height <= 0) continue

        const { size } = normalizeCanvasMetrics(width, height, dprRef.current)
        if (canvasSizeRef.current.w === size.w && canvasSizeRef.current.h === size.h) continue

        const previousSize = canvasSizeRef.current
        if (previousSize.w > 1 && previousSize.h > 1) {
          const viewState = useViewStore.getState()
          viewState.setViewBox(preserveViewCenterOnResize(viewState.viewBox, previousSize, size))
        }
        commitCanvasSize(size)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [canvasSizeRef, commitCanvasSize, containerRef, dprRef])

  useEffect(() => {
    redraw()
  }, [canvasSize, redraw])

  useEffect(() => {
    let previousColor = useAppStore.getState().bgColor
    let previousStyle = useAppStore.getState().backgroundStyle
    const unsubscribeBackground = useAppStore.subscribe((state) => {
      if (state.bgColor === previousColor && state.backgroundStyle === previousStyle) return

      const plainLayerChanged = (state.backgroundStyle === 'plain') !== (previousStyle === 'plain')
      previousColor = state.bgColor
      previousStyle = state.backgroundStyle
      if (plainLayerChanged) elementsDirtyRef.current = true
      scheduleRedraw()
    })

    let previousElements = useAppStore.getState().elements
    let previousLayers = useAppStore.getState().layers
    let previousIds = new Set(previousElements.map((element) => element.id))
    const previousReferences = new Map<string, CanvasElement>()
    for (const element of previousElements) previousReferences.set(element.id, element)

    const unsubscribeElements = useAppStore.subscribe((state) => {
      const currentElements = state.elements
      const currentLayers = state.layers
      if (currentElements === previousElements && currentLayers === previousLayers) return

      elementsDirtyRef.current = true
      invalidateDrawingCaches()
      previousIds = synchronizeElementBoundsCache(
        currentElements,
        previousReferences,
        previousIds,
        boundsCacheRef.current
      )
      previousElements = currentElements
      previousLayers = currentLayers
      scheduleRedraw()
    })

    let previousSelectedIds = useAppStore.getState().selectedIds
    const unsubscribeSelection = useAppStore.subscribe((state) => {
      if (state.selectedIds === previousSelectedIds) return
      previousSelectedIds = state.selectedIds
      elementsDirtyRef.current = true
      scheduleRedraw()
    })

    let previousViewBox = useViewStore.getState().viewBox
    let previousGrid = useViewStore.getState().showGrid
    let previousGridSize = useViewStore.getState().gridSize
    const unsubscribeView = useViewStore.subscribe((state) => {
      if (
        state.viewBox === previousViewBox &&
        state.showGrid === previousGrid &&
        state.gridSize === previousGridSize
      ) {
        return
      }
      previousViewBox = state.viewBox
      previousGrid = state.showGrid
      previousGridSize = state.gridSize
      scheduleRedraw()
    })

    let previousDarkMode = useThemeStore.getState().isDarkMode
    const unsubscribeTheme = useThemeStore.subscribe((state) => {
      if (state.isDarkMode === previousDarkMode) return
      previousDarkMode = state.isDarkMode
      elementsDirtyRef.current = true
      invalidateDrawingCaches()
      scheduleRedraw()
    })

    const invalidateCanvas = () => {
      elementsDirtyRef.current = true
      redrawRef.current()
    }
    window.addEventListener('image-loaded', invalidateCanvas)
    window.addEventListener(CANVAS_INVALIDATED_EVENT, invalidateCanvas)

    return () => {
      unsubscribeBackground()
      unsubscribeElements()
      unsubscribeSelection()
      unsubscribeView()
      unsubscribeTheme()
      window.removeEventListener('image-loaded', invalidateCanvas)
      window.removeEventListener(CANVAS_INVALIDATED_EVENT, invalidateCanvas)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [boundsCacheRef, elementsDirtyRef, scheduleRedraw])

  return scheduleRedraw
}
