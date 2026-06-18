import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUISlice } from './uiState'

describe('uiState slice', () => {
  let state: any
  let set: ReturnType<typeof vi.fn>
  let get: ReturnType<typeof vi.fn>
  let slice: ReturnType<typeof createUISlice>

  beforeEach(() => {
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
      const validStatuses: Array<'idle' | 'saving' | 'saved'> = ['idle', 'saving', 'saved']
      for (const status of validStatuses) {
        set.mockClear()
        slice.setSaveStatus(status)
        expect(set).toHaveBeenCalledWith({ saveStatus: status })
      }
    })
  })
})
