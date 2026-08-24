import { describe, expect, it } from 'vitest'
import { createBlankDocument } from './documentRecords'
import { createDocumentWorkspaceState } from './documentWorkspace'

describe('document workspace projection', () => {
  it('creates an editable default workspace when no document is available', () => {
    const workspace = createDocumentWorkspaceState(undefined)

    expect(workspace).toMatchObject({
      currentDocId: null,
      elements: [],
      bgColor: '#ffffff',
      backgroundStyle: 'plain',
      undoStack: [],
      redoStack: [],
    })
    expect(workspace.layers).toHaveLength(1)
    expect(workspace.activeLayerId).toBe(workspace.layers[0].id)
  })

  it('projects document content, document history, and view settings', () => {
    const document = {
      ...createBlankDocument(100),
      id: 'document-1',
      bgColor: '#fef3c7',
      backgroundStyle: 'dots' as const,
      undoStack: [{ type: 'clear' as const, snapshot: [] }],
      redoStack: [{ type: 'clear' as const, snapshot: [] }],
    }

    const workspace = createDocumentWorkspaceState(document)

    expect(workspace).toMatchObject({
      currentDocId: 'document-1',
      elements: document.elements,
      layers: document.layers,
      activeLayerId: document.activeLayerId,
      bgColor: '#fef3c7',
      backgroundStyle: 'dots',
      undoStack: document.undoStack,
      redoStack: document.redoStack,
    })
  })

  it('can intentionally reset history while retaining document content', () => {
    const document = {
      ...createBlankDocument(100),
      undoStack: [{ type: 'clear' as const, snapshot: [] }],
      redoStack: [{ type: 'clear' as const, snapshot: [] }],
    }

    const workspace = createDocumentWorkspaceState(document, { history: 'empty' })

    expect(workspace.elements).toBe(document.elements)
    expect(workspace.layers).toBe(document.layers)
    expect(workspace.undoStack).toEqual([])
    expect(workspace.redoStack).toEqual([])
  })

  it('matches legacy empty-layer fallback behavior', () => {
    const document = {
      ...createBlankDocument(100),
      layers: [],
      activeLayerId: undefined,
    }

    const workspace = createDocumentWorkspaceState(document)

    expect(workspace.layers).toEqual([])
    expect(workspace.activeLayerId).toBe('layer-default')
  })
})
