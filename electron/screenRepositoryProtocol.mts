import type {
  ScreenDraft,
  ScreenNote,
  ScreenNotePatch,
  ScreenPreferences,
} from '../src/notes/screenNotebook.js'

export type RepositoryRequest =
  | { operation: 'load' }
  | { operation: 'draft'; draft: ScreenDraft; png?: Uint8Array }
  | { operation: 'background'; id: string; png: Uint8Array }
  | { operation: 'getBackground'; id: string }
  | { operation: 'preferences'; preferences: ScreenPreferences }
  | { operation: 'create'; note: ScreenNote; png: Uint8Array; thumbnail: string }
  | { operation: 'list'; query: string; offset: number; trash: boolean }
  | { operation: 'get'; id: string }
  | { operation: 'image'; id: string }
  | { operation: 'update'; id: string; patch: ScreenNotePatch }
  | { operation: 'export'; id?: string }
  | { operation: 'exportFile'; filePath: string; id?: string }
  | { operation: 'import'; entries: { note: ScreenNote; png: Uint8Array; thumbnail: string }[] }
  | { operation: 'importFile'; filePath: string }
  | { operation: 'flush' }
  | { operation: 'close' }

export interface RepositoryEnvelope {
  id: number
  request: RepositoryRequest
}
export interface RepositoryResponse {
  id: number
  value?: unknown
  error?: string
}
