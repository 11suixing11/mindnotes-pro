import { useState, useRef, useCallback, type SetStateAction } from 'react'
import {
  DEFAULT_TEXT_FONT_SIZE,
  MAX_TEXT_BOX_WIDTH,
  MIN_TEXT_BOX_WIDTH,
  createTextWidthMeasurer,
  getOriginalTextContent,
  getTextLayout,
  isAutoResizeText,
  normalizeTextContent,
  normalizeTextFormat,
  toStoredTextFormat,
  type TextFormatState,
} from '../../canvas/textFormatting'
import { useAppStore } from '../../store/appStore'
import { getWritableLayerId, isElementLayerEditable, isLayerWritable } from '../../store/layers'
import { snapshot } from '../../store/helpers'
import { useToastStore } from '../../store/toastStore'
import type { CanvasElement, TextElement } from '../../store/types'

export interface EditingText {
  id: string
  isNew: boolean
  layerId: string
  x: number
  y: number
  screenX: number
  screenY: number
  width: number
  height: number
  content: string
  autoResize: boolean
  wraps: boolean
  fontSize: TextFormatState['fontSize']
  color: TextFormatState['color']
  fontWeight: TextFormatState['fontWeight']
  fontStyle: TextFormatState['fontStyle']
  textDecoration: TextFormatState['textDecoration']
  textAlign: TextFormatState['textAlign']
  backgroundColor?: TextFormatState['backgroundColor']
}

export interface TextRecoveryDraft {
  elementId: string
  element: TextElement | null
}

type ExistingTextForEdit = Pick<
  TextElement,
  | 'id'
  | 'content'
  | 'originalContent'
  | 'autoResize'
  | 'fontSize'
  | 'color'
  | 'width'
  | 'height'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecoration'
  | 'textAlign'
  | 'backgroundColor'
  | 'layerId'
  | 'locked'
>

interface TextEditBaseline {
  sessionId: string
  elements: CanvasElement[]
  element: TextElement | null
}

let fallbackSessionCounter = 0

export function createSessionId(prefix: string): string {
  const webCrypto = globalThis.crypto
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return `${prefix}${webCrypto.randomUUID()}`
  }

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const values = webCrypto.getRandomValues(new Uint32Array(2))
    return `${prefix}${Date.now()}-${values[0].toString(36)}-${values[1].toString(36)}`
  }

  fallbackSessionCounter += 1
  return `${prefix}${Date.now()}-${fallbackSessionCounter}`
}

function matchesExistingText(
  element: TextElement,
  content: string,
  autoResize: boolean,
  format: TextFormatState
): boolean {
  const existingFormat = normalizeTextFormat(element)
  return (
    getOriginalTextContent(element) === content &&
    isAutoResizeText(element) === autoResize &&
    existingFormat.fontSize === format.fontSize &&
    existingFormat.color === format.color &&
    existingFormat.fontWeight === format.fontWeight &&
    existingFormat.fontStyle === format.fontStyle &&
    existingFormat.textDecoration === format.textDecoration &&
    existingFormat.textAlign === format.textAlign &&
    existingFormat.backgroundColor === format.backgroundColor
  )
}

function sameElement(left: CanvasElement | null, right: CanvasElement | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function replaceTextElement(
  elements: CanvasElement[],
  elementId: string,
  nextElement: TextElement | null,
  preferredIndex?: number
): CanvasElement[] {
  const currentIndex = elements.findIndex((element) => element.id === elementId)
  if (currentIndex >= 0) {
    if (!nextElement) return elements.filter((_, index) => index !== currentIndex)
    if (sameElement(elements[currentIndex], nextElement)) return elements
    return elements.map((element, index) => (index === currentIndex ? nextElement : element))
  }

  if (!nextElement) return elements
  const insertionIndex = Math.max(0, Math.min(preferredIndex ?? elements.length, elements.length))
  return [...elements.slice(0, insertionIndex), nextElement, ...elements.slice(insertionIndex)]
}

function getPreferredTextIndex(
  baseline: TextEditBaseline | null,
  elementId: string
): number | undefined {
  if (!baseline) return undefined
  const existingIndex = baseline.elements.findIndex((element) => element.id === elementId)
  return existingIndex >= 0 ? existingIndex : baseline.elements.length
}

export function useTextEditor(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [editingText, setEditingTextState] = useState<EditingText | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  // Keep the active session available to event handlers even while React is
  // batching the state update that follows an input/blur event. The textarea
  // owns the latest content; this ref owns the latest formatting/geometry.
  const editingTextRef = useRef<EditingText | null>(null)
  const commitInProgressRef = useRef(false)
  const baselineRef = useRef<TextEditBaseline | null>(null)
  const draftFailureNotifiedRef = useRef(false)

  const setEditingText = useCallback((next: SetStateAction<EditingText | null>) => {
    // Resolve against the ref immediately instead of waiting for React's
    // functional updater. A blur/beforeunload/toolbar action can submit in the
    // same task as the last edit; commitTextEdit must already see that edit.
    const resolved = typeof next === 'function' ? next(editingTextRef.current) : next
    editingTextRef.current = resolved
    setEditingTextState(resolved)
  }, [])

  const measureLayout = useCallback(
    (content: string, format: TextFormatState, autoResize: boolean, width?: number) => {
      const context = canvasRef.current?.getContext('2d') ?? null
      const measureText = createTextWidthMeasurer(format, context)
      return getTextLayout(content, format, {
        autoResize,
        width,
        maxWidth: MAX_TEXT_BOX_WIDTH,
        measureText,
      })
    },
    [canvasRef]
  )

  const buildTextElement = useCallback(
    (activeEditingText: EditingText, content: string): TextElement => {
      const state = useAppStore.getState()
      const current = state.elements.find(
        (element): element is TextElement =>
          element.id === activeEditingText.id && element.type === 'text'
      )
      const baseline =
        baselineRef.current?.sessionId === activeEditingText.id ? baselineRef.current.element : null
      const format = normalizeTextFormat(activeEditingText)
      const layout = measureLayout(
        normalizeTextContent(content),
        format,
        activeEditingText.autoResize,
        activeEditingText.width
      )

      return {
        ...(baseline ?? {}),
        ...(current ?? {}),
        type: 'text',
        id: activeEditingText.id,
        layerId: current?.layerId ?? baseline?.layerId ?? activeEditingText.layerId,
        x: activeEditingText.x,
        y: activeEditingText.y,
        width: Math.max(MIN_TEXT_BOX_WIDTH, layout.width),
        height: layout.height,
        content: layout.renderedContent,
        originalContent: layout.originalContent,
        autoResize: activeEditingText.autoResize,
        fontSize: format.fontSize,
        color: format.color,
        ...toStoredTextFormat(format),
      }
    },
    [measureLayout]
  )

  const notifyDraftFailure = useCallback(() => {
    if (draftFailureNotifiedRef.current) return
    draftFailureNotifiedRef.current = true
    useToastStore.getState().show('文字暂时无法写入画板，内容仍保留在编辑框中', 'warning', 4000)
  }, [])

  const canWriteTextDraft = useCallback((activeEditingText: EditingText): boolean => {
    const state = useAppStore.getState()
    if (activeEditingText.isNew) {
      return isLayerWritable(state.layers, activeEditingText.layerId)
    }

    const current = state.elements.find((element) => element.id === activeEditingText.id)
    const baseline =
      baselineRef.current?.sessionId === activeEditingText.id ? baselineRef.current.element : null
    const target = current?.type === 'text' ? current : baseline
    return !!target && isElementLayerEditable(target, state.layers)
  }, [])

  const stageTextDraft = useCallback(
    (activeEditingText: EditingText, content: string): boolean => {
      if (!canWriteTextDraft(activeEditingText)) {
        notifyDraftFailure()
        return false
      }

      const state = useAppStore.getState()
      const normalizedContent = normalizeTextContent(content)
      const nextElement =
        activeEditingText.isNew && !normalizedContent.trim()
          ? null
          : buildTextElement(activeEditingText, normalizedContent)
      const nextElements = replaceTextElement(
        state.elements,
        activeEditingText.id,
        nextElement,
        getPreferredTextIndex(baselineRef.current, activeEditingText.id)
      )

      if (nextElements !== state.elements) state.commitElements(nextElements)
      draftFailureNotifiedRef.current = false
      return true
    },
    [buildTextElement, canWriteTextDraft, notifyDraftFailure]
  )

  const createTextRecoveryDraft = useCallback(
    (content: string): TextRecoveryDraft | null => {
      const activeEditingText = editingTextRef.current
      if (!activeEditingText) return null

      const normalizedContent = normalizeTextContent(content)
      if (!normalizedContent.trim()) {
        return { elementId: activeEditingText.id, element: null }
      }

      return {
        elementId: activeEditingText.id,
        element: buildTextElement(activeEditingText, normalizedContent),
      }
    },
    [buildTextElement]
  )

  const measureTextWidth = useCallback(
    (
      content: string,
      fontSize: number,
      fontWeight: TextFormatState['fontWeight'] = 'normal',
      fontStyle: TextFormatState['fontStyle'] = 'normal'
    ): number => {
      const format = normalizeTextFormat({
        fontSize,
        fontWeight,
        fontStyle,
      })
      return measureLayout(content, format, true).width
    },
    [measureLayout]
  )

  const updateEditingTextContent = useCallback(
    (content: string) => {
      const current = editingTextRef.current
      if (!current) return false
      const format = normalizeTextFormat(current)
      const layout = measureLayout(content, format, current.autoResize, current.width)
      const next = {
        ...current,
        content: layout.originalContent,
        width: layout.width,
        height: layout.height,
        wraps: layout.wraps,
      }
      setEditingText(next)
      return stageTextDraft(next, layout.originalContent)
    },
    [measureLayout, setEditingText, stageTextDraft]
  )

  const updateEditingTextFormat = useCallback(
    (patch: Partial<TextFormatState>) => {
      const current = editingTextRef.current
      if (!current) return false
      const format = normalizeTextFormat({ ...current, ...patch })
      const layout = measureLayout(current.content, format, current.autoResize, current.width)
      const next = {
        ...current,
        ...format,
        content: layout.originalContent,
        width: layout.width,
        height: layout.height,
        wraps: layout.wraps,
      }
      setEditingText(next)
      return stageTextDraft(next, layout.originalContent)
    },
    [measureLayout, setEditingText, stageTextDraft]
  )

  const commitTextEdit = useCallback(
    (content: string, expectedId?: string): boolean => {
      const activeEditingText = editingTextRef.current
      if (!activeEditingText || commitInProgressRef.current) return false
      if (expectedId && activeEditingText.id !== expectedId) return false
      const baseline = baselineRef.current
      if (!baseline || baseline.sessionId !== activeEditingText.id) return false
      commitInProgressRef.current = true
      try {
        const format = normalizeTextFormat(activeEditingText)
        const normalizedContent = normalizeTextContent(content)
        const state = useAppStore.getState()
        const currentElement = state.elements.find((element) => element.id === activeEditingText.id)
        const nextElement = normalizedContent.trim()
          ? buildTextElement(activeEditingText, normalizedContent)
          : null
        const baselineIndex = getPreferredTextIndex(baseline, activeEditingText.id)
        const isEquivalentToBaseline = baseline.element
          ? !!nextElement &&
            baseline.element.x === activeEditingText.x &&
            baseline.element.y === activeEditingText.y &&
            matchesExistingText(
              baseline.element,
              normalizedContent,
              activeEditingText.autoResize,
              format
            )
          : nextElement === null

        if (isEquivalentToBaseline) {
          const restoredElements = replaceTextElement(
            state.elements,
            activeEditingText.id,
            baseline.element,
            baselineIndex
          )
          if (restoredElements !== state.elements) state.commitElements(restoredElements)
        } else {
          const needsStoreMutation =
            baseline.element !== null || nextElement !== null || !!currentElement
          if (needsStoreMutation && !canWriteTextDraft(activeEditingText)) {
            notifyDraftFailure()
            return false
          }

          const finalElements = replaceTextElement(
            state.elements,
            activeEditingText.id,
            nextElement,
            baselineIndex
          )
          // The editor mirrors each keystroke into the live store. Build the
          // undo "before" snapshot from the latest surrounding document so a
          // concurrent edit to another element is not rolled back when this
          // text session is undone.
          const beforeElements = replaceTextElement(
            finalElements,
            activeEditingText.id,
            baseline.element,
            baselineIndex
          )
          state.commitElements(finalElements, {
            action: {
              type: 'snapshot',
              before: snapshot(beforeElements),
              after: snapshot(finalElements),
              label: activeEditingText.isNew ? 'Add text' : 'Edit text',
              affectedIds: [activeEditingText.id],
            },
            clearRedo: true,
          })
        }

        baselineRef.current = null
        editingTextRef.current = null
        setEditingText(null)
        return true
      } catch (error) {
        console.error('[text-editor] Failed to commit text edit', error)
        // Keep the live editor open so the user can retry instead of leaving a
        // textarea that can no longer be committed.
        return false
      } finally {
        commitInProgressRef.current = false
      }
    },
    [buildTextElement, canWriteTextDraft, notifyDraftFailure, setEditingText]
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
      commitInProgressRef.current = false
      draftFailureNotifiedRef.current = false
      const state = useAppStore.getState()
      if (existingEl) {
        const storedElement = state.elements.find(
          (element): element is TextElement =>
            element.id === existingEl.id && element.type === 'text'
        )
        const format = normalizeTextFormat(existingEl)
        const content = getOriginalTextContent(existingEl)
        const autoResize = isAutoResizeText(existingEl)
        const layout = measureLayout(content, format, autoResize, existingEl.width)
        baselineRef.current = {
          sessionId: existingEl.id,
          elements: snapshot(state.elements),
          element: storedElement ? { ...storedElement } : null,
        }
        setEditingText({
          id: existingEl.id,
          isNew: false,
          layerId: storedElement?.layerId ?? existingEl.layerId ?? state.activeLayerId,
          x,
          y,
          screenX,
          screenY,
          width: layout.width,
          height: layout.height,
          content: layout.originalContent,
          autoResize,
          wraps: layout.wraps,
          ...format,
        })
      } else {
        const id = createSessionId('text-')
        const layerId = getWritableLayerId(state.layers, state.activeLayerId) ?? state.activeLayerId
        const format = normalizeTextFormat({ color, fontSize: DEFAULT_TEXT_FONT_SIZE })
        const layout = measureLayout('', format, true)
        baselineRef.current = {
          sessionId: id,
          elements: snapshot(state.elements),
          element: null,
        }
        setEditingText({
          id,
          isNew: true,
          layerId,
          x,
          y,
          screenX,
          screenY,
          width: layout.width,
          height: layout.height,
          content: layout.originalContent,
          autoResize: true,
          wraps: layout.wraps,
          ...format,
        })
      }
    },
    [measureLayout, setEditingText]
  )

  const cancelEdit = useCallback(() => {
    commitInProgressRef.current = true
    const baseline = baselineRef.current
    if (baseline) {
      const state = useAppStore.getState()
      const activeEditingText = editingTextRef.current
      const baselineIndex = getPreferredTextIndex(baseline, baseline.sessionId)
      const restored = activeEditingText
        ? replaceTextElement(state.elements, activeEditingText.id, baseline.element, baselineIndex)
        : state.elements
      if (JSON.stringify(state.elements) !== JSON.stringify(restored)) {
        state.commitElements(restored)
      }
    }
    baselineRef.current = null
    editingTextRef.current = null
    setEditingText(null)
  }, [setEditingText])

  return {
    editingText,
    setEditingText,
    textRef,
    measureTextWidth,
    updateEditingTextContent,
    updateEditingTextFormat,
    createTextRecoveryDraft,
    commitTextEdit,
    startEditText,
    cancelEdit,
  }
}
