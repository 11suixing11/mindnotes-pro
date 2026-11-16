/* global process */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyOwnedX11 } from './electron-harness.mjs'
import { runOffline } from './run-offline.mjs'

export async function runLinux(argv = process.argv.slice(2)) {
  try { await verifyOwnedX11() }
  catch (error) { process.stderr.write(`Linux native suite unavailable: ${error.message}\n`); return 2 }
  return runOffline(argv)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await runLinux()
