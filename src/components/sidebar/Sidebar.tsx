import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import type { CanvasDoc } from '../../store/types'
import { useConfirm } from '../confirm-modal'
import CanvasPreview from './CanvasPreview'
import SidebarContextMenu from './SidebarContextMenu'
import type { SidebarContextState } from './SidebarContextMenu'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function documentText(doc: CanvasDoc) {
  return doc.elements
    .filter((element) => element.type === 'text')
    .map((element) => element.content)
    .join('\n')
}

function makeContentSnippet(content: string, query: string) {
  const normalizedContent = content.toLowerCase()
  const index = normalizedContent.indexOf(query)
  if (index === -1) return content.slice(0, 80)

  const start = Math.max(0, index - 24)
  const end = Math.min(content.length, index + query.length + 32)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

function getSearchMatch(doc: CanvasDoc, query: string) {
  if (!query) return { type: 'none' as const, snippet: '' }

  if (doc.title.toLowerCase().includes(query)) {
    return { type: 'title' as const, snippet: doc.title }
  }

  const content = documentText(doc)
  if (content.toLowerCase().includes(query)) {
    return { type: 'content' as const, snippet: makeContentSnippet(content, query) }
  }

  return null
}

function highlightMatch(text: string, query: string) {
  if (!query) return text

  const index = text.toLowerCase().indexOf(query)
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="sb-search-mark">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const docs = useAppStore((state) => state.docs)
  const currentDocId = useAppStore((state) => state.currentDocId)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const createDoc = useAppStore((state) => state.createDoc)
  const openDoc = useAppStore((state) => state.openDoc)
  const renameDoc = useAppStore((state) => state.renameDoc)
  const searchQuery = useAppStore((state) => state.documentSearchQuery)
  const recentSearches = useAppStore((state) => state.recentDocumentSearches)
  const setSearchQuery = useAppStore((state) => state.setDocumentSearchQuery)
  const addRecentSearch = useAppStore((state) => state.addRecentDocumentSearch)
  const confirm = useConfirm()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [context, setContext] = useState<SidebarContextState | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const cancellingRef = useRef(false)
  const confirmingRef = useRef(false)

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleDocs = useMemo(
    () =>
      docs
        .map((doc) => ({ doc, match: getSearchMatch(doc, normalizedSearch) }))
        .filter((item) => !normalizedSearch || item.match),
    [docs, normalizedSearch]
  )

  const saveRecentSearch = useCallback(
    (value: string) => {
      addRecentSearch(value)
    },
    [addRecentSearch]
  )

  const startRename = useCallback((doc: CanvasDoc) => {
    setRenamingId(doc.id)
    setRenameValue(doc.title)
  }, [])

  useEffect(() => {
    if (!renamingId) return
    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renamingId])

  const requestRename = useCallback(
    async (doc: CanvasDoc) => {
      if (confirmingRef.current || renamingId !== doc.id) return

      const nextTitle = renameValue.trim()
      if (!nextTitle || nextTitle === doc.title) {
        setRenamingId(null)
        return
      }

      confirmingRef.current = true
      const accepted = await confirm(`Rename "${doc.title}" to "${nextTitle}"?`, {
        confirmLabel: 'Rename',
        cancelLabel: 'Keep editing',
        danger: false,
      })
      confirmingRef.current = false

      if (accepted) {
        setRenamingId(null)
        void renameDoc(doc.id, nextTitle)
        return
      }

      requestAnimationFrame(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      })
    },
    [confirm, renameDoc, renameValue, renamingId]
  )

  const cancelRename = useCallback(() => {
    cancellingRef.current = true
    setRenamingId(null)
    requestAnimationFrame(() => {
      cancellingRef.current = false
    })
  }, [])

  const openDocument = useCallback(
    (id: string) => {
      if (renamingId === id) return
      saveRecentSearch(searchQuery)
      void openDoc(id)
      if (isMobile) setSidebarOpen(false)
    },
    [isMobile, openDoc, renamingId, saveRecentSearch, searchQuery, setSidebarOpen]
  )

  if (!sidebarOpen) {
    return (
      <button
        type="button"
        aria-label="Open documents"
        aria-expanded="false"
        onClick={() => setSidebarOpen(true)}
        className="sb-toggle-btn"
      >
        <span aria-hidden="true">☰</span>
      </button>
    )
  }

  return (
    <>
      {isMobile && (
        <button
          type="button"
          aria-label="Close documents"
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav aria-label="Documents" className={`sb-panel${isMobile ? ' sb-panel-mobile' : ''}`}>
        <div className="sb-header">
          <div className="sb-header-row">
            <div className="sb-brand">
              <div className="sb-brand-logo" aria-hidden="true">
                M
              </div>
              <span className="sb-brand-name">MindNotes</span>
            </div>
            <button
              type="button"
              aria-label="Close documents"
              className="sb-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              ×
            </button>
          </div>
          <button type="button" className="sb-btn-new" onClick={() => void createDoc()}>
            + New document
          </button>
          <form
            className="sb-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              saveRecentSearch(searchQuery)
            }}
          >
            <input
              type="search"
              aria-label="Search documents"
              className="sb-search-input"
              placeholder="Search documents…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear document search"
                className="sb-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </form>
          {recentSearches.length > 0 && (
            <div className="sb-recent-searches" aria-label="Recent document searches">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="sb-recent-chip"
                  aria-label={`Search again: ${item}`}
                  onClick={() => setSearchQuery(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div role="list" aria-label="Document list" className="sb-tree">
          {visibleDocs.length === 0 && (
            <div className="sb-empty-search" role="status">
              No documents found
            </div>
          )}
          {visibleDocs.map(({ doc, match }) => {
            const isActive = doc.id === currentDocId
            const contentMatch = normalizedSearch && match?.type === 'content' ? match.snippet : ''
            return (
              <div
                key={doc.id}
                role="listitem"
                aria-current={isActive ? 'page' : undefined}
                className={`sb-doc-item${isActive ? ' sb-doc-item-active' : ''}`}
                onClick={() => openDocument(doc.id)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setContext({ x: event.clientX, y: event.clientY, docId: doc.id })
                }}
              >
                <CanvasPreview elements={doc.elements} bgColor={doc.bgColor} />
                {renamingId === doc.id ? (
                  <input
                    ref={renameInputRef}
                    aria-label={`Rename ${doc.title}`}
                    className="sb-rename-input"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onBlur={() => {
                      if (!cancellingRef.current) void requestRename(doc)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void requestRename(doc)
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        cancelRename()
                      }
                    }}
                  />
                ) : (
                  <div
                    className="sb-doc-content"
                    onDoubleClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      startRename(doc)
                    }}
                  >
                    <div className={`sb-doc-title${isActive ? ' sb-doc-title-active' : ''}`}>
                      {highlightMatch(doc.title, normalizedSearch)}
                    </div>
                    <div className={`sb-doc-meta${contentMatch ? ' sb-doc-match' : ''}`}>
                      {contentMatch ? (
                        <>Text: {highlightMatch(contentMatch, normalizedSearch)}</>
                      ) : (
                        formatTime(doc.updatedAt)
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="sb-footer" aria-live="polite">
          {normalizedSearch
            ? `${visibleDocs.length} of ${docs.length} ${docs.length === 1 ? 'document' : 'documents'}`
            : `${docs.length} ${docs.length === 1 ? 'document' : 'documents'}`}
        </div>
      </nav>

      <SidebarContextMenu
        context={context}
        onClose={() => setContext(null)}
        onRename={startRename}
      />
    </>
  )
}
