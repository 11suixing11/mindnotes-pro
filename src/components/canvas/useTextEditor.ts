import { useState, useRef, useCallback } from 'react'
import { useAppStore } from '../../store/appStore'

export interface EditingText {
  id: string
  x: number
  y: number
  screenX: number
  screenY: number
  content: string
  fontSize: number
  color: string
}

export function useTextEditor(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [editingText, setEditingText] = useState<EditingText | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const measureTextWidth = useCallback(
    (content: string, fontSize: number): number => {
      const canvas = canvasRef.current
      if (!canvas) return Math.max(200, content.length * fontSize * 0.6)
      const ctx = canvas.getContext('2d')
      if (!ctx) return Math.max(200, content.length * fontSize * 0.6)
      ctx.font = `${fontSize}px 'Noto Sans SC', 'PingFang SC', sans-serif`
      const lines = content.split('\n')
      let maxW = 0
      for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width)
      return Math.max(40, maxW + 8)
    },
    [canvasRef]
  )

  const commitTextEdit = useCallback(
    (content: string) => {
      if (!editingText) return
      if (editingText.id.startsWith('new-')) {
        if (content.trim()) {
          const lines = content.trim().split('\n')
          const w = measureTextWidth(content.trim(), editingText.fontSize)
          const h = editingText.fontSize * 1.6 * lines.length
          useAppStore.getState().addElement({
            type: 'text',
            id: `text-${Date.now()}`,
            x: editingText.x,
            y: editingText.y,
            width: w,
            height: h,
            content: content.trim(),
            fontSize: editingText.fontSize,
            color: editingText.color,
          })
        }
      } else {
        const el = useAppStore.getState().elements.find((e) => e.id === editingText.id)
        if (el && el.type === 'text') {
          const w = measureTextWidth(content, el.fontSize)
          const lines = content.split('\n')
          const h = el.fontSize * 1.6 * lines.length
          useAppStore.getState().updateElement(editingText.id, () => ({
            ...el,
            content,
            width: Math.max(40, w),
            height: Math.max(el.fontSize * 1.6, h),
          }))
        } else {
          useAppStore
            .getState()
            .updateElement(editingText.id, (e) => (e.type === 'text' ? { ...e, content } : e))
        }
      }
      setEditingText(null)
    },
    [editingText, measureTextWidth]
  )

  const startEditText = useCallback(
    (
      x: number,
      y: number,
      screenX: number,
      screenY: number,
      color: string,
      existingEl?: { id: string; content: string; fontSize: number }
    ) => {
      if (existingEl) {
        setEditingText({
          id: existingEl.id,
          x,
          y,
          screenX,
          screenY,
          content: existingEl.content,
          fontSize: existingEl.fontSize,
          color,
        })
      } else {
        setEditingText({
          id: `new-${Date.now()}`,
          x,
          y,
          screenX,
          screenY,
          content: '',
          fontSize: 16,
          color,
        })
      }
    },
    []
  )

  const cancelEdit = useCallback(() => {
    setEditingText(null)
  }, [])

  return {
    editingText,
    setEditingText,
    textRef,
    measureTextWidth,
    commitTextEdit,
    startEditText,
    cancelEdit,
  }
}
