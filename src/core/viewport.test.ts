import { describe, expect, it } from 'vitest'
import { panViewBox } from './viewport'

describe('viewport helpers', () => {
  it('pans the world opposite to screen movement and accounts for zoom', () => {
    expect(panViewBox({ x: 100, y: 50, zoom: 2 }, { x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({
      x: 90,
      y: 30,
      zoom: 2,
    })
  })
})
