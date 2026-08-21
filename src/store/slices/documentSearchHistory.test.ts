import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DOCUMENT_SEARCH_HISTORY_KEY,
  loadRecentDocumentSearches,
  persistRecentDocumentSearches,
  prependRecentDocumentSearch,
} from './documentSearchHistory'

describe('document search history', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads only recent string entries from localStorage', () => {
    localStorage.setItem(
      DOCUMENT_SEARCH_HISTORY_KEY,
      JSON.stringify(['one', 2, 'two', 'three', 'four', 'five', 'six'])
    )

    expect(loadRecentDocumentSearches()).toEqual(['one', 'two', 'three', 'four', 'five'])
  })

  it('returns an empty history for malformed persisted data', () => {
    localStorage.setItem(DOCUMENT_SEARCH_HISTORY_KEY, '{bad json')

    expect(loadRecentDocumentSearches()).toEqual([])
  })

  it('prepends trimmed searches and deduplicates case-insensitively', () => {
    expect(prependRecentDocumentSearch(['alpha', 'beta'], ' Alpha ')).toEqual(['Alpha', 'beta'])
    expect(prependRecentDocumentSearch(['alpha'], '   ')).toBeUndefined()
  })

  it('bounds and persists the recent list', () => {
    const next = prependRecentDocumentSearch(['two', 'one'], 'three')
    expect(next).toEqual(['three', 'two', 'one'])

    persistRecentDocumentSearches(next ?? [])

    expect(JSON.parse(localStorage.getItem(DOCUMENT_SEARCH_HISTORY_KEY) ?? '[]')).toEqual(next)
  })

  it('keeps the in-memory path usable when storage writes fail', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => persistRecentDocumentSearches(['query'])).not.toThrow()

    setItem.mockRestore()
  })
})
