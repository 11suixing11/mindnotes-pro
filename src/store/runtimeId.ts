let fallbackIdCounter = 0

/** Create collision-resistant IDs for user-generated canvas records. */
export function createRuntimeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  fallbackIdCounter += 1
  return `${prefix}-${Date.now()}-${fallbackIdCounter}-${Math.random().toString(36).slice(2, 8)}`
}
