import { describe, it, expect, beforeEach } from 'vitest'
import { useViewStore } from './useViewStore'

describe('useViewStore', () => {
  beforeEach(() => {
    useViewStore.setState({
      viewBox: { x: 0, y: 0, zoom: 1 },
      isPanning: false,
      lastPanPosition: null,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useViewStore.getState()

    expect(state.viewBox).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(state.isPanning).toBe(false)
    expect(state.lastPanPosition).toBeNull()
  })

  it('should zoom in', () => {
    useViewStore.getState().zoomIn()
    const state = useViewStore.getState()

    expect(state.viewBox.zoom).toBe(1.2)
  })

  it('should zoom out', () => {
    useViewStore.getState().zoomOut()
    const state = useViewStore.getState()

    expect(state.viewBox.zoom).toBeCloseTo(0.833, 3)
  })

  it('should clamp zoom in bounds', () => {
    // Zoom in multiple times
    for (let i = 0; i < 10; i++) {
      useViewStore.getState().zoomIn()
    }

    const state = useViewStore.getState()
    expect(state.viewBox.zoom).toBe(5) // Max zoom
  })

  it('should clamp zoom out bounds', () => {
    // Zoom out multiple times
    for (let i = 0; i < 10; i++) {
      useViewStore.getState().zoomOut()
    }

    const state = useViewStore.getState()
    expect(state.viewBox.zoom).toBe(0.2) // Min zoom
  })

  it('should reset view', () => {
    useViewStore.getState().setViewBox({ x: 100, y: 100, zoom: 2 })
    useViewStore.getState().resetView()

    const state = useViewStore.getState()
    expect(state.viewBox).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('should start pan', () => {
    useViewStore.getState().startPan(100, 200)
    const state = useViewStore.getState()

    expect(state.isPanning).toBe(true)
    expect(state.lastPanPosition).toEqual({ x: 100, y: 200 })
  })

  it('should update pan position', () => {
    useViewStore.getState().startPan(100, 200)
    useViewStore.getState().updatePan(150, 250)

    const state = useViewStore.getState()
    expect(state.lastPanPosition).toEqual({ x: 150, y: 250 })
    expect(state.viewBox.x).toBeCloseTo(-50, 10)
    expect(state.viewBox.y).toBeCloseTo(-50, 10)
  })

  it('should end pan', () => {
    useViewStore.getState().startPan(100, 200)
    useViewStore.getState().endPan()

    const state = useViewStore.getState()
    expect(state.isPanning).toBe(false)
    expect(state.lastPanPosition).toBeNull()
  })

  it('should not update pan if not panning', () => {
    useViewStore.getState().updatePan(150, 250)

    const state = useViewStore.getState()
    expect(state.lastPanPosition).toBeNull()
  })

  it('should reset view and clear panning state', () => {
    useViewStore.getState().startPan(100, 200)
    useViewStore.getState().updatePan(150, 250)
    useViewStore.getState().resetView()

    const state = useViewStore.getState()
    expect(state.viewBox).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(state.isPanning).toBe(false)
    expect(state.lastPanPosition).toBeNull()
  })

  it('should set viewBox directly', () => {
    useViewStore.getState().setViewBox({ x: 50, y: 50, zoom: 1.5 })

    const state = useViewStore.getState()
    expect(state.viewBox).toEqual({ x: 50, y: 50, zoom: 1.5 })
  })

  describe('zoomToFit', () => {
    it('does nothing when bounds is null', () => {
      const before = useViewStore.getState().viewBox
      useViewStore.getState().zoomToFit(null)
      expect(useViewStore.getState().viewBox).toEqual(before)
    })

    it('sets viewBox to fit given bounds', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
      useViewStore.getState().zoomToFit({ x: 100, y: 100, w: 200, h: 200 })
      const state = useViewStore.getState()
      expect(state.viewBox.zoom).toBeGreaterThan(0)
      expect(state.viewBox.zoom).toBeLessThanOrEqual(3)
    })

    it('clamps zoom to max 3', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
      useViewStore.getState().zoomToFit({ x: 0, y: 0, w: 10, h: 10 })
      expect(useViewStore.getState().viewBox.zoom).toBeLessThanOrEqual(3)
    })

    it('handles zero-width bounds without error', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
      useViewStore.getState().zoomToFit({ x: 0, y: 0, w: 0, h: 100 })
      expect(useViewStore.getState().viewBox.zoom).toBeGreaterThan(0)
    })
  })

  describe('toggleGrid', () => {
    it('toggles showGrid from false to true', () => {
      expect(useViewStore.getState().showGrid).toBe(false)
      useViewStore.getState().toggleGrid()
      expect(useViewStore.getState().showGrid).toBe(true)
    })

    it('toggles showGrid from true to false', () => {
      useViewStore.setState({ showGrid: true })
      useViewStore.getState().toggleGrid()
      expect(useViewStore.getState().showGrid).toBe(false)
    })
  })

  describe('pan with zoom', () => {
    it('accounts for zoom level when panning', () => {
      useViewStore.getState().setViewBox({ x: 0, y: 0, zoom: 2 })
      useViewStore.getState().startPan(100, 100)
      useViewStore.getState().updatePan(120, 140)
      const state = useViewStore.getState()
      // dx = (120-100)/2 = 10, dy = (140-100)/2 = 20
      expect(state.viewBox.x).toBeCloseTo(-10)
      expect(state.viewBox.y).toBeCloseTo(-20)
    })
  })
})
