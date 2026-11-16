import { describe, expect, it } from 'vitest'
import {
  defaultOzonePlatform,
  hideScreenInk,
  resolveDesktopBackend,
  surfaceFocusable,
  toolbarWindowShape,
} from './desktopPlatform'

describe('desktop platform policy', () => {
  it('defaults a Linux display to X11 without overriding an explicit caller backend', () => {
    expect(defaultOzonePlatform('linux', { DISPLAY: ':90' })).toBe('x11')
    expect(defaultOzonePlatform('linux', { DISPLAY: ':90' }, 'wayland')).toBeUndefined()
    expect(defaultOzonePlatform('linux', { DISPLAY: ':90' }, '')).toBeUndefined()
    expect(defaultOzonePlatform('linux', { WAYLAND_DISPLAY: 'wayland-0' })).toBeUndefined()
    expect(defaultOzonePlatform('win32', { DISPLAY: ':90' })).toBeUndefined()
  })

  it('reports the requested backend independently of the host session type', () => {
    expect(resolveDesktopBackend('win32', {})).toBe('windows')
    expect(resolveDesktopBackend('linux', { DISPLAY: ':90', XDG_SESSION_TYPE: 'wayland' })).toBe(
      'x11'
    )
    expect(resolveDesktopBackend('linux', { DISPLAY: ':90' }, 'wayland')).toBe('wayland')
    expect(resolveDesktopBackend('linux', { WAYLAND_DISPLAY: 'wayland-0' })).toBe('wayland')
    expect(resolveDesktopBackend('linux', {})).toBe('unsupported')
    expect(resolveDesktopBackend('linux', { DISPLAY: ':90' }, 'headless')).toBe('unsupported')
    expect(resolveDesktopBackend('darwin', {})).toBe('unsupported')
  })

  it('constructs a managed Linux screen layer while keeping the toolbar nonactivating', () => {
    expect(surfaceFocusable('linux', 'screen')).toBe(true)
    expect(surfaceFocusable('linux', 'toolbar')).toBe(false)
    expect(surfaceFocusable('win32', 'screen')).toBe(false)
    expect(surfaceFocusable('win32', 'toolbar')).toBe(false)
  })

  it('hides live and frozen Linux ink only in pointer mode and immediately restores each brush mode', () => {
    expect(hideScreenInk('linux', 'pointer', false)).toBe(true)
    expect(hideScreenInk('linux', 'pointer', true)).toBe(true)
    for (const tool of ['pen', 'highlight', 'erase'] as const) {
      expect(hideScreenInk('linux', tool, false)).toBe(false)
      expect(hideScreenInk('linux', tool, true)).toBe(false)
    }
  })

  it('retains Windows live pointer ink and the existing frozen pointer hiding behavior', () => {
    expect(hideScreenInk('win32', 'pointer', false)).toBe(false)
    expect(hideScreenInk('win32', 'pointer', true)).toBe(true)
    expect(hideScreenInk('win32', 'pen', false)).toBe(false)
    expect(hideScreenInk('win32', 'pen', true)).toBe(false)
  })

  it('keeps the full current Linux bubble and panel bounds available for native hits', () => {
    const strip = { x: 0, y: 278, width: 438, height: 122 }
    const actualBounds = { x: 1180, y: 808, width: 72, height: 64 }
    expect(toolbarWindowShape('linux', true, actualBounds, strip)).toEqual([
      { x: 0, y: 0, width: 72, height: 64 },
    ])
    expect(toolbarWindowShape('linux', true, { width: 72, height: 64 }, strip)).toEqual([
      { x: 0, y: 0, width: 72, height: 64 },
    ])
    expect(toolbarWindowShape('linux', true, { width: 438, height: 400 }, strip)).toEqual([
      { x: 0, y: 0, width: 438, height: 400 },
    ])
    expect(toolbarWindowShape('linux', true, { width: 90, height: 80 }, strip)).toEqual([
      { x: 0, y: 0, width: 90, height: 80 },
    ])
  })

  it('preserves Windows empty-shape reset and the expanded strip input mask on both platforms', () => {
    const strip = { x: 0, y: 278, width: 438, height: 122 }
    expect(toolbarWindowShape('win32', true, { width: 72, height: 64 }, strip)).toEqual([])
    expect(toolbarWindowShape('win32', true, { width: 438, height: 400 }, strip)).toEqual([])
    expect(toolbarWindowShape('linux', false, { width: 438, height: 400 }, strip)).toEqual([
      { x: 0, y: 278, width: 438, height: 122 },
    ])
    expect(toolbarWindowShape('win32', false, { width: 438, height: 400 }, strip)).toEqual([
      { x: 0, y: 278, width: 438, height: 122 },
    ])
  })
})
