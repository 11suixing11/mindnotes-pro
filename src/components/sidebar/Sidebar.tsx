import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilePlus2, Files, Menu, Search, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useToastStore } from '../../store/toastStore'
import type { CanvasDoc } from '../../store/types'
import { useConfirm } from '../confirm-modal'
import CanvasPreview from './CanvasPreview'
import SidebarContextMenu from './SidebarContextMenu'
import type { SidebarContextState } from './SidebarContextMenu'
import LayersPanel from '../layers/LayersPanel'

type DocumentSortMode =
  'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc'

const DOCUMENT_SORT_OPTIONS: { value: DocumentSortMode; label: string }[] = [
  { value: 'updated-desc', label: '最近修改' },
  { value: 'updated-asc', label: '最早修改' },
  { value: 'created-desc', label: '最近创建' },
  { value: 'created-asc', label: '最早创建' },
  { value: 'title-asc', label: '名称升序' },
  { value: 'title-desc', label: '名称降序' },
]

const titleCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

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
  return new Intl.DateTimeFormat('zh-CN', {
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

function compareByTitle(a: CanvasDoc, b: CanvasDoc) {
  const byTitle = titleCollator.compare(a.title, b.title)
  if (byTitle !== 0) return byTitle

  return b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || titleCollator.compare(a.id, b.id)
}

function compareDocs(a: CanvasDoc, b: CanvasDoc, sortMode: DocumentSortMode) {
  switch (sortMode) {
    case 'updated-asc':
      return a.updatedAt - b.updatedAt || compareByTitle(a, b)
    case 'created-desc':
      return b.createdAt - a.createdAt || compareByTitle(a, b)
    case 'created-asc':
      return a.createdAt - b.createdAt || compareByTitle(a, b)
    case 'title-asc':
      return compareByTitle(a, b)
    case 'title-desc':
      return -compareByTitle(a, b)
    case 'updated-desc':
    default:
      return b.updatedAt - a.updatedAt || compareByTitle(a, b)
  }
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
  const toast = useToastStore((state) => state.show)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [context, setContext] = useState<SidebarContextState | null>(null)
  const [sortMode, setSortMode] = useState<DocumentSortMode>('updated-desc')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const cancellingRef = useRef(false)
  const confirmingRef = useRef(false)

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleDocs = useMemo(
    () =>
      docs
        .map((doc) => ({ doc, match: getSearchMatch(doc, normalizedSearch) }))
        .filter((item) => !normalizedSearch || item.match)
        .sort((a, b) => compareDocs(a.doc, b.doc, sortMode)),
    [docs, normalizedSearch, sortMode]
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
      const accepted = await confirm(`将“${doc.title}”重命名为“${nextTitle}”？`, {
        confirmLabel: '重命名',
        cancelLabel: '继续编辑',
        danger: false,
      })
      confirmingRef.current = false

      if (accepted) {
        try {
          await renameDoc(doc.id, nextTitle)
          setRenamingId(null)
        } catch {
          toast('文档重命名失败，请重试', 'error')
          requestAnimationFrame(() => renameInputRef.current?.focus())
        }
        return
      }

      requestAnimationFrame(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      })
    },
    [confirm, renameDoc, renameValue, renamingId, toast]
  )

  const cancelRename = useCallback(() => {
    cancellingRef.current = true
    setRenamingId(null)
    requestAnimationFrame(() => {
      cancellingRef.current = false
    })
  }, [])

  const openDocument = useCallback(
    async (id: string) => {
      if (renamingId === id) return
      saveRecentSearch(searchQuery)
      try {
        await openDoc(id)
        if (isMobile) setSidebarOpen(false)
      } catch {
        toast('文档打开失败，请重试', 'error')
      }
    },
    [isMobile, openDoc, renamingId, saveRecentSearch, searchQuery, setSidebarOpen, toast]
  )

  const createDocument = useCallback(async () => {
    try {
      await createDoc()
      if (isMobile) setSidebarOpen(false)
    } catch {
      toast('文档创建失败，请检查浏览器存储权限', 'error')
    }
  }, [createDoc, isMobile, setSidebarOpen, toast])

  if (!sidebarOpen) {
    return (
      <button
        type="button"
        aria-label="打开文档面板"
        aria-expanded="false"
        onClick={() => setSidebarOpen(true)}
        className="sb-toggle-btn"
      >
        <Menu size={18} aria-hidden="true" />
      </button>
    )
  }

  return (
    <>
      {isMobile && (
        <button
          type="button"
          aria-label="关闭文档面板"
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav aria-label="文档" className={`sb-panel${isMobile ? ' sb-panel-mobile' : ''}`}>
        <div className="sb-header">
          <div className="sb-header-row">
            <div className="sb-brand">
              <Files size={18} aria-hidden="true" />
              <span className="sb-brand-name">文档</span>
            </div>
            <button
              type="button"
              aria-label="关闭文档面板"
              className="sb-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="sb-btn-new" onClick={() => void createDocument()}>
            <FilePlus2 size={15} aria-hidden="true" />
            <span>新建文档</span>
          </button>
          <form
            className="sb-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              saveRecentSearch(searchQuery)
            }}
          >
            <Search className="sb-search-icon" size={14} aria-hidden="true" />
            <input
              type="search"
              aria-label="搜索文档"
              className="sb-search-input"
              placeholder="搜索标题或文字内容"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="清除文档搜索"
                className="sb-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </form>
          <div className="sb-sort-row">
            <label htmlFor="document-sort" className="sb-sort-label">
              排序
            </label>
            <select
              id="document-sort"
              aria-label="文档排序"
              className="sb-sort-select"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as DocumentSortMode)}
            >
              {DOCUMENT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {recentSearches.length > 0 && (
            <div className="sb-recent-searches" aria-label="最近的文档搜索">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="sb-recent-chip"
                  aria-label={`再次搜索：${item}`}
                  onClick={() => setSearchQuery(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div role="list" aria-label="文档列表" className="sb-tree">
          {visibleDocs.length === 0 && (
            <div className="sb-empty-search" role="status">
              未找到文档
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
                onClick={() => void openDocument(doc.id)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setContext({ x: event.clientX, y: event.clientY, docId: doc.id })
                }}
              >
                <CanvasPreview elements={doc.elements} layers={doc.layers} bgColor={doc.bgColor} />
                {renamingId === doc.id ? (
                  <input
                    ref={renameInputRef}
                    aria-label={`重命名 ${doc.title}`}
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
                        <>正文：{highlightMatch(contentMatch, normalizedSearch)}</>
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

        <LayersPanel />

        <div className="sb-footer" aria-live="polite">
          {normalizedSearch
            ? `显示 ${visibleDocs.length} / ${docs.length} 个文档`
            : `${docs.length} 个文档`}
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
