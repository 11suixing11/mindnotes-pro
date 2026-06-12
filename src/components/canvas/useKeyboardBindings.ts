import { useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import type { ToolType } from '../../store/types'

interface Options {
  copySelectedToSystemClipboard?: () => void
}

function getViewportCenter(): { x: number; y: number } {
  const vb = useViewStore.getState().viewBox
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: vb.x + vw / 2 / vb.zoom,
    y: vb.y + vh / 2 / vb.zoom,
  }
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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !e.shiftKey) {
        e.preventDefault()
        const clipRead = navigator.clipboard?.read?.bind(navigator.clipboard)
        if (!clipRead) {
          st.paste()
          return
        }
        clipRead()
          .then(async (items) => {
            for (const item of items) {
              for (const type of item.types) {
                if (type.startsWith('image/')) {
                  const blob = await item.getType(type)
                  const reader = new FileReader()
                  reader.onload = () => {
                    const dataUrl = reader.result as string
                    const img = new Image()
                    img.onload = () => {
                      const center = getViewportCenter()
                      const maxDim = 400
                      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
                      const w = Math.round(img.width * scale)
                      const h = Math.round(img.height * scale)
                      st.addElement({
                        type: 'image',
                        id: `img-${Date.now()}`,
                        x: center.x - w / 2,
                        y: center.y - h / 2,
                        width: w,
                        height: h,
                        dataUrl,
                      })
                    }
                    img.src = dataUrl
                  }
                  reader.readAsDataURL(blob)
                  return
                }
              }
            }
            st.paste()
          })
          .catch(() => {
            st.paste()
          })
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

      // Arrow key nudging for selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (st.selectedIds.length > 0) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          st.moveElementsById(st.selectedIds, dx, dy)
          return
        }
      }

      // Grid toggle (G key)
      if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        useViewStore.setState((s: any) => ({ showGrid: !(s as any).showGrid }))
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
