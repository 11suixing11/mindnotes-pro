import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilePlus2, Files, Menu, Search, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useToastStore } from '../../store/toastStore'
import type { CanvasDoc } from '../../store/types'
import { useConfirm } from '../confirm-modal'
import SidebarContextMenu from './SidebarContextMenu'
import type { SidebarContextState } from './SidebarContextMenu'
import SidebarDocumentList from './SidebarDocumentList'
import {
  DOCUMENT_SORT_OPTIONS,
  getVisibleDocuments,
  normalizeDocumentSearch,
  type DocumentSortMode,
} from './sidebarDocumentModel'
import LayersPanel from '../layers/LayersPanel'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
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

  const normalizedSearch = normalizeDocumentSearch(searchQuery)
  const visibleDocs = useMemo(
    () => getVisibleDocuments(docs, normalizedSearch, sortMode),
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

  const blurRename = useCallback(
    (doc: CanvasDoc) => {
      if (!cancellingRef.current) void requestRename(doc)
    },
    [requestRename]
  )

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

        <SidebarDocumentList
          documents={visibleDocs}
          currentDocId={currentDocId}
          normalizedSearch={normalizedSearch}
          renamingId={renamingId}
          renameValue={renameValue}
          renameInputRef={renameInputRef}
          onOpenDocument={(id) => void openDocument(id)}
          onOpenContextMenu={setContext}
          onRenameValueChange={setRenameValue}
          onRenameBlur={blurRename}
          onRenameConfirm={(doc) => void requestRename(doc)}
          onRenameCancel={cancelRename}
          onStartRename={startRename}
        />

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
