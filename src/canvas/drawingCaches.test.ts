import { afterEach, describe, expect, it, vi } from 'vitest'
import { LRUCache } from './drawingCaches'

describe('LRUCache', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('evicts the least recently used entry', () => {
    const cache = new LRUCache<string, number>(2, 1000)
    cache.set('first', 1)
    cache.set('second', 2)

    expect(cache.get('first')).toBe(1)
    cache.set('third', 3)

    expect(cache.get('second')).toBeNull()
    expect(cache.get('first')).toBe(1)
    expect(cache.get('third')).toBe(3)
  })

  it('removes entries after their time to live expires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T00:00:00Z'))
    const cache = new LRUCache<string, number>(2, 1000)
    cache.set('entry', 1)

    vi.advanceTimersByTime(1001)

    expect(cache.get('entry')).toBeNull()
    expect(cache.size()).toBe(0)
  })

  it('clears all entries', () => {
    const cache = new LRUCache<string, number>(2, 1000)
    cache.set('first', 1)
    cache.set('second', 2)

    cache.clear()

    expect(cache.size()).toBe(0)
    expect(cache.get('first')).toBeNull()
  })
})
