import { useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import type { ToolType } from '../../store/types'

interface Options {
  copySelectedToSystemClipboard?: () => void
}

export function useKeyboardBindings(options: Options = {}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') return

      const st = useAppStore.getState()
      const vs = useViewStore.getState()

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        st.copySelected()
        options.copySelectedToSystemClipboard?.()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        st.paste()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        st.setSelectedIds(st.elements.map((el) => el.id))
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (st.selectedIds.length > 0) {
          st.removeElements(st.selectedIds)
          return
        }
      }

      const toolMap: Record<string, ToolType> = {
        '1': 'pen',
        '2': 'eraser',
        '3': 'pan',
        '4': 'rectangle',
        '5': 'circle',
        '6': 'text',
        '7': 'line',
        '8': 'arrow',
        '0': 'select',
      }

      if (toolMap[e.key]) {
        st.setTool(toolMap[e.key])
        return
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        vs.zoomIn()
        return
      }

      if (e.key === '-') {
        e.preventDefault()
        vs.zoomOut()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
