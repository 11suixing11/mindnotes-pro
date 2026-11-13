import type { ElectronApplication, Page } from '@playwright/test'
import type { ScreenStroke } from '../../src/notes/screenInk.js'
import type { ScreenNote } from '../../src/notes/screenNotebook.js'
import type { PageNotebook } from '../../src/notes/model.js'
import type {} from '../../src/notes/floating.js'
import type {} from '../../src/notes/desktop.js'

export class DesktopUnavailable extends Error {}
export interface DesktopLaunchOptions {
  directory: string
  executable?: string
  offline?: boolean
  allowVisible?: boolean
}
export interface ProxyRequest {
  method: string
  url: string
}
export interface OfflineEvidence {
  directControl: boolean
  directApplicationHits: number
  defaultControl: { route: string; response: number }
  pageControl: { route: string; response: number; partition: string }
  proxyRequests: ProxyRequest[]
}
export interface DesktopSession {
  app: ElectronApplication
  toolbar: Page
  overlay: Page
  directory: string
  close(): Promise<void>
  timings: { launchToBubbleReadyMs: number; expandToolbarMs: number }
  offlineEvidence?: OfflineEvidence
}
export function preflightDesktop(
  options?: Pick<DesktopLaunchOptions, 'allowVisible' | 'executable'>
): Promise<{ executablePath: string; packaged: boolean }>
export function startDenyProxy(): Promise<{
  port: number
  requests: ProxyRequest[]
  readonly overflow: boolean
  close(): Promise<void>
}>
export function launchIsolated(options: DesktopLaunchOptions): Promise<DesktopSession>
export function withDesktopWorkspace<T>(work: (directory: string) => Promise<T>): Promise<T>
export function waitUntil<T>(
  read: () => T | Promise<T>,
  accepts: (value: T) => boolean,
  description: string,
  timeout?: number
): Promise<T>
export function prepareFixture(
  directory: string,
  notes?: number
): Promise<{
  entries: { note: ScreenNote; png: Uint8Array; thumbnail: string }[]
  pages: PageNotebook[]
}>
export function openLibrary(session: DesktopSession): Promise<Page>
export function currentDisplay(session: DesktopSession): Promise<{
  id: string
  bounds: { x: number; y: number; width: number; height: number }
  scaleFactor: number
}>
export function importFullDraft(session: DesktopSession, filePath: string): Promise<ScreenStroke[]>
export function measureGesture(
  session: DesktopSession,
  count?: number
): Promise<{
  stroke: ScreenStroke
  pointerCommandMs: number
  gestureToSavedMs: number
  dispatchedPoints: number
}>
export function observeFrames<T>(
  page: Page,
  seconds: number,
  operation: () => Promise<T>
): Promise<{
  result: T
  frames: number[]
  tasks: number[]
  overflow: boolean
}>
