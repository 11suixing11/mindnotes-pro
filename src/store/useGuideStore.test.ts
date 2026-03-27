import { describe, it, expect, beforeEach } from 'vitest'
import { useGuideStore } from './useGuideStore'

describe('useGuideStore', () => {
  beforeEach(() => {
    useGuideStore.setState({
      showGuides: true,
      snapToGrid: false,
      gridSize: 20,
      guideLines: null,
    })
  })

  it('should initialize with correct default state', () => {
    const state = useGuideStore.getState()

    expect(state.showGuides).toBe(true)
    expect(state.snapToGrid).toBe(false)
    expect(state.gridSize).toBe(20)
    expect(state.guideLines).toBeNull()
  })

  it('should toggle show guides', () => {
    useGuideStore.getState().toggleShowGuides()
    expect(useGuideStore.getState().showGuides).toBe(false)

    useGuideStore.getState().toggleShowGuides()
    expect(useGuideStore.getState().showGuides).toBe(true)
  })

  it('should toggle snap to grid', () => {
    useGuideStore.getState().toggleSnapToGrid()
    expect(useGuideStore.getState().snapToGrid).toBe(true)

    useGuideStore.getState().toggleSnapToGrid()
    expect(useGuideStore.getState().snapToGrid).toBe(false)
  })

  it('should set grid size', () => {
    useGuideStore.getState().setGridSize(30)
    expect(useGuideStore.getState().gridSize).toBe(30)
  })

  it('should set guide lines', () => {
    const guidelines = [
      { type: 'horizontal' as const, position: 100 },
      { type: 'vertical' as const, position: 200 },
    ]

    useGuideStore.getState().setGuideLines(guidelines)
    expect(useGuideStore.getState().guideLines).toEqual(guidelines)
  })

  it('should clear guide lines', () => {
    const guidelines = [
      { type: 'horizontal' as const, position: 100 },
    ]

    useGuideStore.getState().setGuideLines(guidelines)
    useGuideStore.getState().clearGuideLines()

    expect(useGuideStore.getState().guideLines).toBeNull()
  })
})
