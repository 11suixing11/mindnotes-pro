import { expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Ordinary test software; its pixels go through Windows desktopCapturer. */
export async function startNativeCaptureFixture(bounds?: {
  x: number
  y: number
  width: number
  height: number
}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mindnotes-capture-fixture-'))
  const stateFile = path.join(directory, 'state.txt')
  const child = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      path.resolve('e2e/desktop/desktop-fixture.ps1'),
      '-StatePath',
      stateFile,
      ...(bounds
        ? [
            '-Left',
            String(bounds.x),
            '-Top',
            String(bounds.y),
            '-Width',
            String(bounds.width),
            '-Height',
            String(bounds.height),
          ]
        : []),
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  let output = ''
  child.stderr.on('data', (data) => {
    output += data
  })
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once('exit', resolve)
    child.once('error', reject)
  })
  void exited.catch(() => {})
  try {
    await expect
      .poll(async () => {
        if (child.exitCode !== null) throw new Error(`Native fixture exited: ${output}`)
        return readFile(`${stateFile}.ready`, 'utf8').catch(() => '')
      })
      .toBe('A')
    if (bounds) {
      const actual = JSON.parse(await readFile(`${stateFile}.bounds`, 'utf8'))
      expect(actual).toEqual({
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      })
    }
  } catch (error) {
    await writeFile(stateFile, 'exit')
    throw error
  }
  return {
    directory,
    native: JSON.parse(await readFile(`${stateFile}.native`, 'utf8')),
    async changeToB() {
      await writeFile(stateFile, 'B')
      await expect.poll(() => readFile(`${stateFile}.ready`, 'utf8')).toBe('B')
    },
    async close() {
      await writeFile(stateFile, 'exit')
      const code = await Promise.race([
        exited,
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error('Native fixture did not close')), 10_000).unref()
        ),
      ])
      if (code !== 0) throw new Error(`Native fixture exit ${code}: ${output}`)
    },
  }
}

export async function withNativeCaptureFixture(
  work: (fixture: Awaited<ReturnType<typeof startNativeCaptureFixture>>) => Promise<void>,
  bounds?: { x: number; y: number; width: number; height: number }
) {
  const fixture = await startNativeCaptureFixture(bounds)
  try {
    await work(fixture)
  } finally {
    await fixture.close()
  }
}
