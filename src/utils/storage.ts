import localforage from 'localforage'

// 初始化本地存储
localforage.config({
  name: 'MindNotes Pro',
  version: 1.0,
  storeName: 'mindnotes',
  description: 'MindNotes Pro 本地存储',
})

// 自动保存状态
export async function autoSaveState(state: any) {
  try {
    await localforage.setItem('autosave', {
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)),
    })
    console.log('[AutoSave] 状态已保存')
  } catch (error) {
    console.error('[AutoSave] 保存失败:', error)
  }
}

// 恢复保存的状态
export async function restoreState() {
  try {
    const saved: any = await localforage.getItem('autosave')
    if (saved) {
      console.log('[AutoSave] 发现保存的状态:', new Date((saved as any).timestamp))
      return (saved as any).state
    }
  } catch (error) {
    console.error('[AutoSave] 恢复失败:', error)
  }
  return null
}

// 导出笔记
export async function exportNote(filename: string, data: any) {
  try {
    await localforage.setItem(`export-${filename}`, {
      timestamp: Date.now(),
      data,
    })
    console.log('[Export] 笔记已导出:', filename)
  } catch (error) {
    console.error('[Export] 导出失败:', error)
  }
}

// 导入笔记
export async function importNote(filename: string) {
  try {
    const imported: any = await localforage.getItem(`export-${filename}`)
    if (imported) {
      console.log('[Import] 笔记已导入:', filename)
      return (imported as any).data
    }
  } catch (error) {
    console.error('[Import] 导入失败:', error)
  }
  return null
}

// 清空所有数据
export async function clearAllData() {
  try {
    await localforage.clear()
    console.log('[Clear] 所有数据已清空')
  } catch (error) {
    console.error('[Clear] 清空失败:', error)
  }
}
