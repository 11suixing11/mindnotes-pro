import localforage from 'localforage'

localforage.config({
  name: 'MindNotes Pro',
  version: 1.0,
  storeName: 'mindnotes',
  description: 'MindNotes Pro 本地存储',
})

interface SavedState {
  timestamp: number
  strokes: unknown[]
  shapes: unknown[]
  viewBox: { x: number; y: number; zoom: number }
}

interface ExportData {
  timestamp: number
  data: unknown
}

export async function autoSaveState(state: SavedState): Promise<void> {
  try {
    await localforage.setItem('autosave', {
      timestamp: Date.now(),
      strokes: state.strokes,
      shapes: state.shapes,
      viewBox: state.viewBox,
    })
  } catch (error) {
    console.error('[AutoSave] 保存失败:', error)
  }
}

export async function restoreState(): Promise<SavedState | null> {
  try {
    const saved = await localforage.getItem<SavedState>('autosave')
    if (saved) {
      return saved
    }
  } catch (error) {
    console.error('[AutoSave] 恢复失败:', error)
  }
  return null
}

export async function exportNote(filename: string, data: unknown): Promise<void> {
  try {
    await localforage.setItem(`export-${filename}`, {
      timestamp: Date.now(),
      data,
    })
  } catch (error) {
    console.error('[Export] 导出失败:', error)
  }
}

export async function importNote(filename: string): Promise<unknown | null> {
  try {
    const imported = await localforage.getItem<ExportData>(`export-${filename}`)
    if (imported) {
      return imported.data
    }
  } catch (error) {
    console.error('[Import] 导入失败:', error)
  }
  return null
}

export async function clearAllData(): Promise<void> {
  try {
    await localforage.clear()
  } catch (error) {
    console.error('[Clear] 清空失败:', error)
  }
}
