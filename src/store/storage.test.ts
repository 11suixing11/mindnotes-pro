import { describe, it, expect } from 'vitest'
import { openDB, getAll, get, put, del } from './storage'

describe('storage', () => {
  describe('exports', () => {
    it('should export openDB function', () => {
      expect(openDB).toBeTypeOf('function')
    })

    it('should export getAll function', () => {
      expect(getAll).toBeTypeOf('function')
    })

    it('should export get function', () => {
      expect(get).toBeTypeOf('function')
    })

    it('should export put function', () => {
      expect(put).toBeTypeOf('function')
    })

    it('should export del function', () => {
      expect(del).toBeTypeOf('function')
    })
  })

  describe('function signatures', () => {
    it('getAll should accept store name', () => {
      expect(getAll.length).toBe(1)
    })

    it('get should accept store name and id', () => {
      expect(get.length).toBe(2)
    })

    it('put should accept store name and record', () => {
      expect(put.length).toBe(2)
    })

    it('del should accept store name and id', () => {
      expect(del.length).toBe(2)
    })
  })
})
