export const DOCUMENT_SEARCH_HISTORY_KEY = 'mn-sidebar-searches'
export const MAX_RECENT_DOCUMENT_SEARCHES = 5

function getStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function loadRecentDocumentSearches(): string[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const parsed = JSON.parse(storage.getItem(DOCUMENT_SEARCH_HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .slice(0, MAX_RECENT_DOCUMENT_SEARCHES)
      : []
  } catch {
    return []
  }
}

export function persistRecentDocumentSearches(searches: string[]): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(DOCUMENT_SEARCH_HISTORY_KEY, JSON.stringify(searches))
  } catch {
    // Search remains usable even when persisted history is unavailable.
  }
}

export function prependRecentDocumentSearch(
  searches: string[],
  query: string
): string[] | undefined {
  const nextSearch = query.trim()
  if (!nextSearch) return undefined

  return [
    nextSearch,
    ...searches.filter((item) => item.toLowerCase() !== nextSearch.toLowerCase()),
  ].slice(0, MAX_RECENT_DOCUMENT_SEARCHES)
}
