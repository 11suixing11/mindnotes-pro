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
    state = { saveStatus: 'idle', sidebarOpen: true }
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

    it('starts with the document sidebar open on desktop-sized viewports', () => {
      expect(slice.sidebarOpen).toBe(true)
    })

    it('starts with the document sidebar closed on mobile-sized viewports', () => {
      createSlice(390)

      expect(slice.sidebarOpen).toBe(false)
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

  describe('setSidebarOpen', () => {
    it('updates sidebar visibility', () => {
      slice.setSidebarOpen(false)
      expect(set).toHaveBeenCalledWith({ sidebarOpen: false })
    })
  })
})
