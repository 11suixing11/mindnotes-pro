import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUISlice } from './uiState'

describe('uiState slice', () => {
  let state: any
  let set: ReturnType<typeof vi.fn>
  let get: ReturnType<typeof vi.fn>
  let slice: ReturnType<typeof createUISlice>

  function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    })
  }

  function createSlice(width = 1024) {
    setViewportWidth(width)
    state = { saveStatus: 'idle' }
    set = vi.fn((update: any) => {
      if (typeof update === 'function') {
        Object.assign(state, update(state))
      } else {
        Object.assign(state, update)
      }
    }) as any
    get = vi.fn(() => state) as any
    slice = createUISlice(set, get)
  }

  beforeEach(() => {
    createSlice()
  })

  describe('initial state', () => {
    it('starts with saveStatus idle', () => {
      expect(slice.saveStatus).toBe('idle')
    })
  })

  describe('setSaveStatus', () => {
    it('sets saveStatus to saving', () => {
      slice.setSaveStatus('saving')
      expect(set).toHaveBeenCalledWith({ saveStatus: 'saving' })
    })

    it('sets saveStatus to saved', () => {
      slice.setSaveStatus('saved')
      expect(set).toHaveBeenCalledWith({ saveStatus: 'saved' })
    })

    it('sets saveStatus to idle', () => {
      state.saveStatus = 'saving'
      slice.setSaveStatus('idle')
      expect(set).toHaveBeenCalledWith({ saveStatus: 'idle' })
    })

    it('handles all valid save status values', () => {
      const validStatuses: Array<'idle' | 'saving' | 'saved' | 'error'> = [
        'idle',
        'saving',
        'saved',
        'error',
      ]
      for (const status of validStatuses) {
        set.mockClear()
        slice.setSaveStatus(status)
        expect(set).toHaveBeenCalledWith({ saveStatus: status })
      }
    })
  })
})
