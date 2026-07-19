import { useCallback, useEffect, useRef, useState } from 'react'
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

export default function Sidebar() {
  const isMobile = useIsMobile()
  const docs = useAppStore((state) => state.docs)
  const currentDocId = useAppStore((state) => state.currentDocId)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const createDoc = useAppStore((state) => state.createDoc)
  const openDoc = useAppStore((state) => state.openDoc)
  const renameDoc = useAppStore((state) => state.renameDoc)
  const confirm = useConfirm()

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [context, setContext] = useState<SidebarContextState | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const cancellingRef = useRef(false)
  const confirmingRef = useRef(false)

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
      void openDoc(id)
      if (isMobile) setSidebarOpen(false)
    },
    [isMobile, openDoc, renamingId, setSidebarOpen]
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
        </div>

        <div role="list" aria-label="Document list" className="sb-tree">
          {docs.map((doc) => {
            const isActive = doc.id === currentDocId
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
                <CanvasPreview
                  elements={doc.elements}
                  bgColor={isActive ? 'var(--primary-bg)' : doc.bgColor}
                />
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
                      {doc.title}
                    </div>
                    <div className="sb-doc-meta">{formatTime(doc.updatedAt)}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="sb-footer" aria-live="polite">
          {docs.length} {docs.length === 1 ? 'document' : 'documents'}
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
