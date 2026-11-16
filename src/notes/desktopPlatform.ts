import type { ScreenTool } from './screenInk.js'

export type DesktopEnvironment = Readonly<Record<string, string | undefined>>
export type DesktopBackend = 'windows' | 'x11' | 'wayland' | 'unsupported'

export function defaultOzonePlatform(
  platform: string,
  env: DesktopEnvironment,
  explicit?: string
): string | undefined {
  return platform === 'linux' && explicit === undefined && env.DISPLAY ? 'x11' : undefined
}

export function resolveDesktopBackend(
  platform: string,
  env: DesktopEnvironment,
  ozoneOption?: string
): DesktopBackend {
  if (platform === 'win32') return 'windows'
  if (platform !== 'linux') return 'unsupported'
  if (ozoneOption === 'x11' || ozoneOption === 'wayland') return ozoneOption
  if (ozoneOption !== undefined && ozoneOption !== 'auto') return 'unsupported'
  if (ozoneOption === 'auto' && env.WAYLAND_DISPLAY) return 'wayland'
  if (env.DISPLAY) return 'x11'
  if (env.WAYLAND_DISPLAY) return 'wayland'
  return 'unsupported'
}

export function surfaceFocusable(platform: string, surface: 'screen' | 'toolbar'): boolean {
  return platform === 'linux' && surface === 'screen'
}

export function hideScreenInk(platform: string, tool: ScreenTool, frozen: boolean): boolean {
  return tool === 'pointer' && (platform === 'linux' || frozen)
}

interface WindowRectangle {
  x: number
  y: number
  width: number
  height: number
}

export function toolbarWindowShape(
  platform: string,
  fullWindow: boolean,
  bounds: Pick<WindowRectangle, 'width' | 'height'>,
  strip: WindowRectangle
): WindowRectangle[] {
  if (!fullWindow) return [{ ...strip }]
  // On Linux, an empty X11 bounding shape removes native hits instead of resetting it.
  return platform === 'linux' ? [{ x: 0, y: 0, width: bounds.width, height: bounds.height }] : []
}
