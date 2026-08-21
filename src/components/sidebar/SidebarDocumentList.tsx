import type { RefObject } from 'react'
import type { CanvasDoc } from '../../store/types'
import CanvasPreview from './CanvasPreview'
import type { SidebarContextState } from './SidebarContextMenu'
import { formatDocumentTime, type VisibleDocument } from './sidebarDocumentModel'

interface SidebarDocumentListProps {
  documents: VisibleDocument[]
  currentDocId: string | null
  normalizedSearch: string
  renamingId: string | null
  renameValue: string
  renameInputRef: RefObject<HTMLInputElement | null>
  onOpenDocument: (id: string) => void
  onOpenContextMenu: (context: SidebarContextState) => void
  onRenameValueChange: (value: string) => void
  onRenameBlur: (doc: CanvasDoc) => void
  onRenameConfirm: (doc: CanvasDoc) => void
  onRenameCancel: () => void
  onStartRename: (doc: CanvasDoc) => void
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

export default function SidebarDocumentList({
  documents,
  currentDocId,
  normalizedSearch,
  renamingId,
  renameValue,
  renameInputRef,
  onOpenDocument,
  onOpenContextMenu,
  onRenameValueChange,
  onRenameBlur,
  onRenameConfirm,
  onRenameCancel,
  onStartRename,
}: SidebarDocumentListProps) {
  return (
    <div role="list" aria-label="文档列表" className="sb-tree">
      {documents.length === 0 && (
        <div className="sb-empty-search" role="status">
          未找到文档
        </div>
      )}
      {documents.map(({ doc, match }) => {
        const isActive = doc.id === currentDocId
        const contentMatch = normalizedSearch && match?.type === 'content' ? match.snippet : ''

        return (
          <div
            key={doc.id}
            role="listitem"
            aria-current={isActive ? 'page' : undefined}
            className={`sb-doc-item${isActive ? ' sb-doc-item-active' : ''}`}
            onClick={() => onOpenDocument(doc.id)}
            onContextMenu={(event) => {
              event.preventDefault()
              onOpenContextMenu({ x: event.clientX, y: event.clientY, docId: doc.id })
            }}
          >
            <CanvasPreview elements={doc.elements} layers={doc.layers} bgColor={doc.bgColor} />
            {renamingId === doc.id ? (
              <input
                ref={renameInputRef}
                aria-label={`重命名 ${doc.title}`}
                className="sb-rename-input"
                value={renameValue}
                onChange={(event) => onRenameValueChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onBlur={() => onRenameBlur(doc)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onRenameConfirm(doc)
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    onRenameCancel()
                  }
                }}
              />
            ) : (
              <div
                className="sb-doc-content"
                onDoubleClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onStartRename(doc)
                }}
              >
                <div className={`sb-doc-title${isActive ? ' sb-doc-title-active' : ''}`}>
                  {highlightMatch(doc.title, normalizedSearch)}
                </div>
                <div className={`sb-doc-meta${contentMatch ? ' sb-doc-match' : ''}`}>
                  {contentMatch ? (
                    <>正文：{highlightMatch(contentMatch, normalizedSearch)}</>
                  ) : (
                    formatDocumentTime(doc.updatedAt)
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
