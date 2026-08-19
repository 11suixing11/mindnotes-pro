import { describe, expect, it } from 'vitest'
import {
  clientToWorld,
  getGridSnapDelta,
  screenToWorld,
  snapPointIfEnabled,
  snapPointToGrid,
  snapTargetIfEnabled,
  snapValueToGrid,
  worldToClient,
  zoomViewBoxAtScreenPoint,
} from './coordinates'

describe('canvas coordinate helpers', () => {
  const viewBox = { x: 100, y: 50, zoom: 2 }
  const rect = { left: 10, top: 20 }

  it('converts canvas-local screen coordinates to world coordinates', () => {
    expect(screenToWorld({ x: 40, y: 60 }, viewBox)).toEqual({ x: 120, y: 80 })
  })

  it('converts client coordinates using the canvas bounding rect', () => {
    expect(clientToWorld({ x: 50, y: 80 }, rect, viewBox)).toEqual({ x: 120, y: 80 })
  })

  it('round-trips world and client coordinates', () => {
    const world = { x: 132, y: 91 }
    expect(worldToClient(world, rect, viewBox)).toEqual({ x: 74, y: 102 })
    expect(clientToWorld(worldToClient(world, rect, viewBox), rect, viewBox)).toEqual(world)
  })

  it('keeps the anchor world point fixed when zooming', () => {
    const next = zoomViewBoxAtScreenPoint(viewBox, { x: 40, y: 60 }, 4)
    expect(next).toEqual({ x: 110, y: 65, zoom: 4 })
    expect(screenToWorld({ x: 40, y: 60 }, next)).toEqual({ x: 120, y: 80 })
  })

  it('snaps a point only when grid snapping is enabled', () => {
    const point = { x: 14, y: 31 }
    expect(snapPointIfEnabled(point, false, 20)).toBe(point)
    expect(snapPointIfEnabled(point, true, 20)).toEqual({ x: 20, y: 40 })
  })

  it('owns the deterministic grid primitives', () => {
    expect(snapValueToGrid(13, 20)).toBe(20)
    expect(snapValueToGrid(13, 0)).toBe(13)
    expect(snapPointToGrid({ x: 13, y: 27 }, 20)).toEqual({ x: 20, y: 20 })
    expect(getGridSnapDelta({ x: 13, y: 27, w: 50, h: 30 }, 20)).toEqual({
      dx: 7,
      dy: -7,
      linesX: [20],
      linesY: [20],
    })
  })

  it('snaps optional resize targets and reports guide lines', () => {
    expect(snapTargetIfEnabled({ x: 13 }, true, 20)).toEqual({
      x: 20,
      linesX: [20],
      linesY: [],
    })
    expect(snapTargetIfEnabled({ y: 40 }, true, 20)).toEqual({
      y: 40,
      linesX: [],
      linesY: [],
    })
    expect(snapTargetIfEnabled({ x: 13, y: 27 }, false, 20)).toEqual({
      x: 13,
      y: 27,
      linesX: [],
      linesY: [],
    })
  })
})
