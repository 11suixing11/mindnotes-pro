import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import localforage from 'localforage'

localforage.config({
  name: 'MindNotes Pro',
  version: 1.0,
  storeName: 'mindnotes',
})

interface SavedState {
  strokes: unknown[]
  shapes: unknown[]
  textElements: unknown[]
  viewBox: { x: number; y: number; zoom: number }
  timestamp: number
}

const SAVE_DELAY = 2000 // 2 秒防抖

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // 恢复保存的状态
  const restore = useCallback(async () => {
    try {
      const saved = await localforage.getItem<SavedState>('autosave')
      if (!saved) return false

      const { strokes, shapes, textElements, viewBox } = saved
      const store = useAppStore.getState()

      // 只在画布为空时恢复（避免覆盖用户新内容）
      if (store.strokes.length > 0 || store.shapes.length > 0 || store.textElements.length > 0) return false

      useAppStore.setState({
        strokes: (strokes as typeof store.strokes) || [],
        shapes: (shapes as typeof store.shapes) || [],
        textElements: (textElements as typeof store.textElements) || [],
        viewBox: viewBox || { x: 0, y: 0, zoom: 1 },
      })

      console.log('[AutoSave] 已恢复上次的画布')
      return true
    } catch (err) {
      console.warn('[AutoSave] 恢复失败:', err)
      return false
    }
  }, [])

  // 保存当前状态
  const save = useCallback(async () => {
    try {
      const { strokes, shapes, textElements, viewBox } = useAppStore.getState()
      await localforage.setItem('autosave', {
        strokes,
        shapes,
        textElements,
        viewBox,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.warn('[AutoSave] 保存失败:', err)
    }
  }, [])

  // 监听状态变化，防抖保存
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      // 只在有内容时保存
      if (state.strokes.length === 0 && state.shapes.length === 0 && state.textElements.length === 0) return

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(save, SAVE_DELAY)
    })

    // 页面关闭前同步保存
    const handleBeforeUnload = () => {
      const { strokes, shapes, textElements, viewBox } = useAppStore.getState()
      if (strokes.length > 0 || shapes.length > 0 || textElements.length > 0) {
        // 同步写入（beforeunload 里不能用 async）
        try {
          localStorage.setItem(
            'autosave-sync',
            JSON.stringify({ strokes, shapes, textElements, viewBox, timestamp: Date.now() })
          )
        } catch {
          // 忽略
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      unsubscribe()
      clearTimeout(timerRef.current)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [save])

  return { restore, save }
}
