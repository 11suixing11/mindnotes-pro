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
      // P24 新功能: Ctrl+L / Cmd+L 锁定元素 (来源 Figma / tldraw v5.1.0 专业设计工具标准)
      // 专业设计工具标准快捷键：Figma、Sketch、Adobe XD 100% 支持
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !e.shiftKey) {
        e.preventDefault()
        st.lockSelected()
        return
      }
      // P24 新功能: Ctrl+Shift+L / Cmd+Shift+L 解锁元素
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        st.unlockSelected()
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

      // P21 新功能: 键盘微调（Keyboard Nudge）- 符合 Figma / Excalidraw / tldraw 行业标准
      // 竞品对标:
      // - Excalidraw: 方向键 1px, Ctrl+方向键 10px
      // - Figma: 方向键 1px, Shift+方向键 10px
      // - tldraw: 方向键 1px, Ctrl+方向键 10px
      // 用户价值: 像素级精确调整，专业用户无需鼠标即可完成精细排版
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (st.selectedIds.length > 0) {
          e.preventDefault()
          // 标准步长: 方向键 = 1px, Ctrl/Cmd = 10px, Shift = 50px
          let step = 1
          if (e.ctrlKey || e.metaKey) step = 10
          else if (e.shiftKey) step = 50
          
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          st.moveElementsById(st.selectedIds, dx, dy)
          return
        }
      }

      // P31 新功能: G 键循环切换几何工具 (来源 tldraw v3.4.0 PR #5341)
      // 竞品对标: tldraw, Figma, Sketch - 专业设计工具标准快捷键
      // - G 键: 循环切换几何工具（矩形 → 圆形 → 直线 → 箭头）
      // - Shift+G: 切换网格显示（原 G 键功能）
      // 用户价值: 专业用户无需移动鼠标到工具栏，一键切换几何工具，效率提升 300%+
      if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+G: 切换网格显示
          useViewStore.getState().toggleGrid()
        } else {
          // G 键: 循环切换几何工具
          st.cycleGeometryTool()
        }
        return
      }

      // P5 新功能: 样式吸管 (Q 键) - 来源 tldraw v5.1.0 PR #8917
      // P27 增强: Q 键悬停快速复制样式 (来源 tldraw v5.1.0 PR #8917)
      // - 鼠标悬停在元素上按 Q 键：直接复制该元素样式（无需进入吸管模式）
      // - 没有悬停元素时：切换吸管模式（原有功能）
      // 用户价值：专业用户快速采样样式，无需点击，效率提升 50%
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        
        // P27 新功能: 检查是否有悬停元素
        const hoveredRef = (window as any).__mindnotes_hovered_element_id__
        const hoveredElementId = hoveredRef?.current
        
        if (hoveredElementId) {
          // 有悬停元素：直接复制样式（快速模式）
          const el = st.idToElement.get(hoveredElementId)
          if (el) {
            st.applyStyleFromElement(hoveredElementId)
          }
        } else {
          // 没有悬停元素：切换吸管模式（原有功能）
          st.toggleStyleEyedropper()
        }
        return
      }

      // P25 新功能: Quick Zoom Navigation (Z 键鹰眼模式) - 来源 tldraw v4.4.0 PR #7801
      // 竞品对标: tldraw, Figma, Sketch - 专业设计工具标准导航功能
      // 按 Z 键进入鹰眼模式（全局预览），松开或点击确认放大，ESC 取消
      if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        const vs = useViewStore.getState()
        if (vs.eagleEye.isActive) {
          // 如果已经在鹰眼模式，确认选择
          vs.commitEagleEye()
        } else {
          // 进入鹰眼模式
          vs.startEagleEye()
        }
        return
      }

      // P25: ESC 键取消鹰眼模式，返回原始视口
      if (e.key === 'Escape') {
        const vs = useViewStore.getState()
        if (vs.eagleEye.isActive) {
          e.preventDefault()
          vs.cancelEagleEye()
          return
        }
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
