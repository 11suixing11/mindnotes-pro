export const isDebugLoggingEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true'

export function debugLog(...args: unknown[]) {
  if (isDebugLoggingEnabled) {
    console.log(...args)
  }
}

export function debugError(...args: unknown[]) {
  if (isDebugLoggingEnabled) {
    console.error(...args)
  }
}
