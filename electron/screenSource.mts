import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ScreenSource } from '../src/notes/screenNotebook.js'
import { readLinuxSessionState } from './linuxSession.mjs'
import type { LinuxSessionOptions } from './linuxSession.mjs'

const execute = promisify(execFile)
const script = `[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding $false
Add-Type -TypeDefinition 'using System; using System.Text; using System.Runtime.InteropServices;
public static class MindNotesSource {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int x; public int y; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint id);
  [DllImport("user32.dll")] public static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
  [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder information, int length, out int needed);
}'
$annotationForeground=[MindNotesSource]::GetForegroundWindow()
$annotationForegroundPid=0
[void][MindNotesSource]::GetWindowThreadProcessId($annotationForeground,[ref]$annotationForegroundPid)
$annotationForegroundProcess=Get-Process -Id $annotationForegroundPid -ErrorAction SilentlyContinue
$annotationWindow=$annotationForeground
__MINDNOTES_SOURCE_POINT__
$annotationText=New-Object System.Text.StringBuilder 512
[void][MindNotesSource]::GetWindowText($annotationWindow,$annotationText,512)
$annotationPid=0
[void][MindNotesSource]::GetWindowThreadProcessId($annotationWindow,[ref]$annotationPid)
$annotationProcess=Get-Process -Id $annotationPid -ErrorAction SilentlyContinue
$annotationDesktop=[MindNotesSource]::OpenInputDesktop(0,$false,1)
$annotationDesktopName=New-Object System.Text.StringBuilder 256
$annotationNeeded=0
if($annotationDesktop -ne [IntPtr]::Zero) {
  [void][MindNotesSource]::GetUserObjectInformation($annotationDesktop,2,$annotationDesktopName,512,[ref]$annotationNeeded)
  [void][MindNotesSource]::CloseDesktop($annotationDesktop)
}
@{app=$annotationProcess.ProcessName;title=$annotationText.ToString();restricted=($annotationDesktopName.ToString() -ne 'Default' -or $annotationForegroundProcess.ProcessName -in @('LockApp','LogonUI'))} | ConvertTo-Json -Compress`

export async function currentScreenSource(
  display: string,
  physicalPoint?: { x: number; y: number },
  linuxSessionOptions?: LinuxSessionOptions
): Promise<ScreenSource & { restricted?: boolean; unavailable?: boolean }> {
  if (process.platform === 'linux') {
    const session = await readLinuxSessionState(linuxSessionOptions)
    return {
      app: '',
      title: '',
      display,
      restricted: session.known && (session.locked || !session.active),
      unavailable: !session.known,
    }
  }
  if (process.platform !== 'win32') return { app: '', title: '', display }
  try {
    if (
      physicalPoint &&
      ![physicalPoint.x, physicalPoint.y].every(
        (value) => Number.isFinite(value) && Math.abs(value) <= 1_000_000
      )
    )
      throw new Error('Invalid display point')
    const pointScript = physicalPoint
      ? `
      [void][MindNotesSource]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
      $annotationPoint=New-Object MindNotesSource+Point
      $annotationPoint.x=${Math.round(physicalPoint.x)}
      $annotationPoint.y=${Math.round(physicalPoint.y)}
      $annotationHit=[MindNotesSource]::WindowFromPoint($annotationPoint)
      if($annotationHit -ne [IntPtr]::Zero) { $annotationWindow=[MindNotesSource]::GetAncestor($annotationHit,2) }
    `
      : ''
    const result = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        script.replace('__MINDNOTES_SOURCE_POINT__', pointScript),
      ],
      { windowsHide: true, timeout: 2000, maxBuffer: 8_000 }
    )
    const value = JSON.parse(result.stdout) as {
      app?: string
      title?: string
      restricted?: boolean
    }
    if (typeof value.restricted !== 'boolean') throw new Error('Desktop state unavailable')
    return {
      app: String(value.app ?? '').slice(0, 500),
      title: String(value.title ?? '').slice(0, 500),
      display,
      restricted: value.restricted === true,
    }
  } catch {
    return { app: '', title: '', display, unavailable: true }
  }
}
