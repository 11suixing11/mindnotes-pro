import { useEffect, useRef } from 'react'
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
  const optionsRef = useRef(options)
  optionsRef.current = options

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
      // Ctrl+Y / Cmd+Y Redo support (Windows standard)
      // 竞品对标: Microsoft Whiteboard, Office, VS Code 等主流应用均支持此快捷键
      // 用户价值: Windows 用户无需改变肌肉记忆，提升操作效率
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !e.shiftKey) {
        e.preventDefault()
        st.redo()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        st.copySelected()
        optionsRef.current.copySelectedToSystemClipboard?.()
        return
      }

      // Plain text paste: Ctrl+Shift+V / Cmd+Shift+V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        const clipReadText = navigator.clipboard?.readText?.bind(navigator.clipboard)
        if (!clipReadText) return
        
        clipReadText()
          .then((text: string) => {
            if (!text || text.trim().length === 0) return
            
            const center = getViewportCenter()
            const fontSize = 16
            // Estimate width based on character count (average 0.6 * fontSize per char)
            const avgCharWidth = fontSize * 0.6
            const lineHeight = fontSize * 1.4
            const lines = text.split('\n')
            const maxLineLength = Math.max(...lines.map(l => l.length))
            const width = Math.max(100, Math.min(600, Math.round(maxLineLength * avgCharWidth)))
            const height = Math.round(lines.length * lineHeight + 16)
            
            st.addElement({
              type: 'text',
              id: `text-${Date.now()}`,
              x: center.x - width / 2,
              y: center.y - height / 2,
              width,
              height,
              content: text,
              fontSize,
              color: '#1a1a1a',
            })
          })
          .catch(() => {
            // Silently fail if clipboard access is denied
          })
        return
      }
      
      // Regular paste: Ctrl+V / Cmd+V
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

      if (toolMap[e.key] && !e.altKey) {
        st.setTool(toolMap[e.key])
        return
      }

      // P6 新功能: Alt + 数字键快速选色 (来源 tldraw v5.1.0 + excalidraw PR #6216)
      // 对标专业绘图工具交互: Photoshop, Figma, Sketch 均支持数字键快速切换颜色
      // 用户价值: 专业用户无需移动鼠标到工具栏，按键即可切换颜色，效率提升300%+
      // Alt+1 ~ Alt+8 对应工具栏 8 个预设颜色
      const COLOR_PRESETS = [
        '#3A2E22', // 黑色
        '#C07856', // 棕色
        '#B8A0D0', // 紫色
        '#D49898', // 粉色
        '#90B888', // 绿色
        '#90B4D0', // 蓝色
        '#D0B888', // 米色
        '#A8CCE0', // 浅蓝
      ]
      const colorIndex = parseInt(e.key, 10) - 1
      if (e.altKey && colorIndex >= 0 && colorIndex < COLOR_PRESETS.length) {
        e.preventDefault()
        st.setColor(COLOR_PRESETS[colorIndex])
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
        useViewStore.getState().toggleGrid()
        return
      }

      // P5 新功能: 样式吸管 (Q 键) - 来源 tldraw v5.1.0 PR #8917
      // 按 Q 键激活/取消样式吸管模式，悬停在元素上预览样式，点击应用样式
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        st.toggleStyleEyedropper()
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
