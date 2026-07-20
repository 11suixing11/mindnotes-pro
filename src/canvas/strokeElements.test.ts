import { describe, expect, it } from 'vitest'
import { createStrokeElement } from './strokeElements'

describe('createStrokeElement', () => {
  it('returns null when there are no points', () => {
    expect(
      createStrokeElement({
        id: 'stroke-1',
        points: [],
        color: '#000',
        size: 4,
        brush: 'pen',
      })
    ).toBeNull()
  })

  it('duplicates a single point so taps create drawable strokes', () => {
    const stroke = createStrokeElement({
      id: 'stroke-1',
      points: [[10, 20]],
      color: '#000',
      size: 4,
      brush: 'pen',
    })

    expect(stroke?.points).toEqual([
      [10, 20],
      [10.1, 20.1],
    ])
  })

  it('simplifies stroke points with the default tolerance', () => {
    const stroke = createStrokeElement({
      id: 'stroke-1',
      points: [
        [0, 0],
        [0.2, 0.2],
        [10, 10],
      ],
      color: '#000',
      size: 4,
      brush: 'pen',
    })

    expect(stroke?.points).toEqual([
      [0, 0],
      [10, 10],
    ])
  })

  it('applies shared default opacity to translucent brushes', () => {
    const stroke = createStrokeElement({
      id: 'stroke-1',
      points: [
        [0, 0],
        [10, 10],
      ],
      color: '#000',
      size: 4,
      brush: 'watercolor',
    })

    expect(stroke).toMatchObject({
      type: 'stroke',
      id: 'stroke-1',
      color: '#000',
      size: 4,
      brush: 'watercolor',
      opacity: 0.22,
    })
  })

  it('does not add opacity to opaque brushes', () => {
    const stroke = createStrokeElement({
      id: 'stroke-1',
      points: [
        [0, 0],
        [10, 10],
      ],
      color: '#000',
      size: 4,
      brush: 'pen',
    })

    expect(stroke?.opacity).toBeUndefined()
  })
})
