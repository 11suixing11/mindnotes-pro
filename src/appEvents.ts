/** Browser event used to open the shared file entry point. */
export const OPEN_TEMPLATES_EVENT = 'mindnotes:open-templates'
export const OPEN_FILE_EVENT = 'mindnotes:open-file'

/**
 * The same event is used by every non-toolbar entry point. The intent only
 * changes what the single ExportMenu handler does after receiving it:
 * opening the file menu or opening the backup picker directly.
 */
export type OpenFileIntent = 'menu' | 'import'

export interface OpenFileEventDetail {
  intent?: OpenFileIntent
}

export function createOpenFileEvent(intent: OpenFileIntent = 'menu') {
  return new CustomEvent<OpenFileEventDetail>(OPEN_FILE_EVENT, {
    detail: { intent },
  })
}
