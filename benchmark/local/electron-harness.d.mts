import type { ElectronApplication, Page } from '@playwright/test'
import type { ChildProcess } from 'node:child_process'
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
  diagnosticNoSandbox?: boolean
  ozonePlatform?: 'x11' | 'wayland'
}
export interface ProxyRequest {
  method: string
  url: string
  status: number
}
export interface DenyProxy {
  port: number
  requests: ProxyRequest[]
  readonly overflow: boolean
  close(): Promise<void>
}
export interface ProxyControl {
  route: string
  response: number
  target: string
  proxyRequests: ProxyRequest[]
}
export interface OfflineEvidence {
  directControl: boolean
  directApplicationHits: number
  defaultControl: ProxyControl
  lazyNavigation: { target: string; proxyRequests: ProxyRequest[] }
  pageControl: ProxyControl & { partition: string }
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
  runtime: {
    teardown: { pid?: number; exitCode: number | null; signalCode: string | null; normalExit: boolean; forced: boolean; ownedRemaining?: number[]; errors: string[] }
    backend: 'x11' | 'windows'
    sessionType: string
    display: string
    executablePath: string
    launchExecutablePath: string
    actualExecutablePath: string
    launchArguments: string[]
    actualArguments: string[]
    ozonePlatform: string
    binary: { format: 'ELF' | 'PE'; arch: string }
    sandbox: { chromiumSandbox: boolean; mode: string; kernelSandboxVerified: boolean; actualSwitches: string[]; securityScope: string }
  }
}
export function preflightDesktop(
  options?: Pick<DesktopLaunchOptions, 'allowVisible' | 'executable' | 'diagnosticNoSandbox' | 'ozonePlatform'>
): Promise<{ executablePath: string; launchExecutablePath: string; packaged: boolean; backend: 'x11' | 'windows'; binary: { format: 'ELF' | 'PE'; arch: string }; sandbox: { chromiumSandbox: boolean; mode: string; kernelSandboxVerified: boolean } }>
export function validateSourceAssets(directory?: string): Promise<string[]>
export function selectDesktopExecutable(
  executable?: string, environment?: Readonly<{ MINDNOTES_EXECUTABLE?: string }>
): { executable: string | undefined; packaged: boolean }
export function startDenyProxy(): Promise<DenyProxy>
export function createDesktopCloser(options: {
  child: ChildProcess
  proxy?: DenyProxy
  mainPid?: number
  ownedProcessGroup?: number
  beforeClose(): Promise<void>
  closeApplication(): Promise<void>
  graceMs?: number
  killMs?: number
  requireNormalExit?: boolean
  expectedCloseError?(error: Error): boolean
  artifactCleanup?(): Promise<void>
  onTeardown?(observation: { pid?: number; exitCode: number | null; signalCode: string | null; normalExit: boolean; forced: boolean; ownedRemaining: number[]; errors: string[] }): void
}): () => Promise<void>
export function proxyControlEvidence<T extends { route: string; response: number }>(
  proxy: DenyProxy, before: number, target: string, control: T, directHits: number
): T & ProxyControl
export function launchIsolated(options: DesktopLaunchOptions): Promise<DesktopSession>
export function withDesktopWorkspace<T>(work: (directory: string) => Promise<T>): Promise<T>
export function withDesktopTempDirectory<T>(directory: string, work: () => Promise<T>): Promise<T>
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

export function pathsMatch(actual: string, expected: string, platform?: string): boolean
export function desktopBackend(platform?: string, environment?: Readonly<Record<string, string | undefined>>, ozonePlatform?: string): 'x11' | 'windows'
export function desktopSandboxOptions(diagnosticNoSandbox?: boolean): { chromiumSandbox: boolean; mode: string; kernelSandboxVerified: boolean }
export function validateDesktopBinary(executablePath: string, platform?: string, arch?: string): Promise<{ format: 'ELF' | 'PE'; arch: string }>
export function verifyOwnedX11(environment?: Readonly<Record<string, string | undefined>>): Promise<{ display: string; serverPid: number; marker: string; xauthority: string; runtimeAlias: string }>

export function desktopLaunchArgs(options?: { platform?: string; env?: Readonly<Record<string, string | undefined>>; packaged?: boolean; args?: readonly string[] }): string[]
export function validateLinuxAppRun(executablePath: string): Promise<string>
