import { useState, useRef, useCallback } from 'react'
import {
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_FONT_SIZE,
  getTextFont,
  getTextLineHeight,
  normalizeTextFormat,
  toStoredTextFormat,
  type TextFormatState,
} from '../../canvas/textFormatting'
import { useAppStore } from '../../store/appStore'
import type { TextElement } from '../../store/types'

export interface EditingText {
  id: string
  x: number
  y: number
  screenX: number
  screenY: number
  width: number
  height: number
  content: string
  fontSize: TextFormatState['fontSize']
  color: TextFormatState['color']
  fontWeight: TextFormatState['fontWeight']
  fontStyle: TextFormatState['fontStyle']
  textDecoration: TextFormatState['textDecoration']
  textAlign: TextFormatState['textAlign']
  backgroundColor?: TextFormatState['backgroundColor']
}

type ExistingTextForEdit = Pick<
  TextElement,
  | 'id'
  | 'content'
  | 'fontSize'
  | 'color'
  | 'width'
  | 'height'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecoration'
  | 'textAlign'
  | 'backgroundColor'
>

export function useTextEditor(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [editingText, setEditingText] = useState<EditingText | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const measureTextWidth = useCallback(
    (
      content: string,
      fontSize: number,
      fontWeight: TextFormatState['fontWeight'] = 'normal',
      fontStyle: TextFormatState['fontStyle'] = 'normal'
    ): number => {
      const canvas = canvasRef.current
      if (!canvas) return Math.max(200, content.length * fontSize * 0.6)
      const ctx = canvas.getContext('2d')
      if (!ctx) return Math.max(200, content.length * fontSize * 0.6)
      ctx.font = getTextFont({ fontSize, fontWeight, fontStyle })
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
      const format = normalizeTextFormat(editingText)
      const storedFormat = toStoredTextFormat(format)
      const committedContent = editingText.id.startsWith('new-') ? content.trim() : content
      const w = Math.max(
        40,
        editingText.width,
        measureTextWidth(committedContent, format.fontSize, format.fontWeight, format.fontStyle)
      )
      const lines = committedContent.split('\n')
      const lineHeight = getTextLineHeight(format.fontSize)
      const h = Math.max(lineHeight, lineHeight * lines.length)

      if (editingText.id.startsWith('new-')) {
        if (committedContent) {
          useAppStore.getState().addElement({
            type: 'text',
            id: `text-${Date.now()}`,
            x: editingText.x,
            y: editingText.y,
            width: w,
            height: h,
            content: committedContent,
            fontSize: format.fontSize,
            color: format.color,
            ...storedFormat,
          })
        }
      } else {
        const el = useAppStore.getState().elements.find((e) => e.id === editingText.id)
        if (el && el.type === 'text') {
          useAppStore.getState().updateElement(editingText.id, () => ({
            ...el,
            content: committedContent,
            width: Math.max(40, w),
            height: Math.max(lineHeight, h),
            fontSize: format.fontSize,
            color: format.color,
            ...storedFormat,
          }))
        } else {
          useAppStore.getState().updateElement(editingText.id, (e) =>
            e.type === 'text'
              ? {
                  ...e,
                  content: committedContent,
                  fontSize: format.fontSize,
                  color: format.color,
                  ...storedFormat,
                }
              : e
          )
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
      existingEl?: ExistingTextForEdit
    ) => {
      if (existingEl) {
        const format = normalizeTextFormat(existingEl)
        setEditingText({
          id: existingEl.id,
          x,
          y,
          screenX,
          screenY,
          width: existingEl.width,
          height: existingEl.height,
          content: existingEl.content,
          ...format,
        })
      } else {
        const format = normalizeTextFormat({ color, fontSize: DEFAULT_TEXT_FONT_SIZE })
        setEditingText({
          id: `new-${Date.now()}`,
          x,
          y,
          screenX,
          screenY,
          width: DEFAULT_TEXT_BOX_WIDTH,
          height: getTextLineHeight(DEFAULT_TEXT_FONT_SIZE),
          content: '',
          ...format,
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
