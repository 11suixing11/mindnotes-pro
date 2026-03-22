import localforage from 'localforage'
import { debugLog, debugError } from './logger'

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
    debugLog('[AutoSave] 状态已保存')
  } catch (error) {
    debugError('[AutoSave] 保存失败:', error)
  }
}

// 恢复保存的状态
export async function restoreState() {
  try {
    const saved: any = await localforage.getItem('autosave')
    if (saved) {
      debugLog('[AutoSave] 发现保存的状态:', new Date((saved as any).timestamp))
      return (saved as any).state
    }
  } catch (error) {
    debugError('[AutoSave] 恢复失败:', error)
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
    debugLog('[Export] 笔记已导出:', filename)
  } catch (error) {
    debugError('[Export] 导出失败:', error)
  }
}

// 导入笔记
export async function importNote(filename: string) {
  try {
    const imported: any = await localforage.getItem(`export-${filename}`)
    if (imported) {
      debugLog('[Import] 笔记已导入:', filename)
      return (imported as any).data
    }
  } catch (error) {
    debugError('[Import] 导入失败:', error)
  }
  return null
}

// 清空所有数据
export async function clearAllData() {
  try {
    await localforage.clear()
    debugLog('[Clear] 所有数据已清空')
  } catch (error) {
    debugError('[Clear] 清空失败:', error)
  }
}
