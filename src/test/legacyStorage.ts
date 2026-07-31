const LEGACY_STORAGE_ENCRYPTION_KEY = 'mindnotes-pro-encryption-key-2024'

export function encodeLegacyStorageValue(value: unknown): string {
  const serialized = JSON.stringify(value)
  let encrypted = ''
  for (let index = 0; index < serialized.length; index++) {
    encrypted += String.fromCharCode(
      serialized.charCodeAt(index) ^
        LEGACY_STORAGE_ENCRYPTION_KEY.charCodeAt(index % LEGACY_STORAGE_ENCRYPTION_KEY.length)
    )
  }
  return btoa(
    encodeURIComponent(encrypted).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
  )
}
