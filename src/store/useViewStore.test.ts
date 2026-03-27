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

  it('should set viewBox directly', () => {
    useViewStore.getState().setViewBox({ x: 50, y: 50, zoom: 1.5 })

    const state = useViewStore.getState()
    expect(state.viewBox).toEqual({ x: 50, y: 50, zoom: 1.5 })
  })
})
