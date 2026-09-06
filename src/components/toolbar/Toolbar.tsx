import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyPlus,
  Lock,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { formatShortcutBinding, type ShortcutActionId } from '../../keyboard/shortcuts'
import { useAppStore } from '../../store/appStore'
import {
  getSelectionStyleModel,
  type SelectionStylePatch,
  type SelectionStyleValue,
} from '../../store/slices/canvasElementStyle'
import { getSelectionCapabilities } from '../../store/slices/selectionCapabilities'
import type { BrushType } from '../../store/types'
import { useShortcutStore } from '../../store/useShortcutStore'
import { useToastStore } from '../../store/toastStore'
import { useConfirm } from '../confirm-modal'
import { requestClearCanvas } from '../confirm-modal/requestClearCanvas'
import { ExportMenu } from '../export-menu'
import TemplateMenu from '../templates/TemplateMenu'
import ArrangeMenu from './ArrangeMenu'
import BrushSelector from './BrushSelector'
import CanvasActionButtons from './CanvasActionButtons'
import ColorPicker from './ColorPicker'
import MobileSelectionActions from './MobileSelectionActions'
import MobileToolbar from './MobileToolbar'
import TextStyleControls from './TextStyleControls'
import ToolButtons from './ToolButtons'
import { icons } from './icons'
import { getStyleCommandMessage } from './styleCommandFeedback'

interface ToolbarProps {
  canInstall?: boolean
  onInstall?: () => void
}

type HorizontalScrollDirection = -1 | 1

function useHorizontalToolbarScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({
    canScrollBack: false,
    canScrollForward: false,
  })

  const updateScrollState = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const next = {
      canScrollBack: container.scrollLeft > 2,
      canScrollForward:
        container.scrollLeft + container.clientWidth < container.scrollWidth - 2,
    }
    setScrollState((current) =>
      current.canScrollBack === next.canScrollBack &&
      current.canScrollForward === next.canScrollForward
        ? current
        : next
    )
  }, [])

  useLayoutEffect(() => {
    updateScrollState()
  }, [updateScrollState])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollState)
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(updateScrollState)
    const observeChildren = () => {
      observer?.observe(container)
      container.querySelectorAll(':scope > *').forEach((child) => observer?.observe(child))
    }

    container.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    mutationObserver?.observe(container, { childList: true, subtree: true })
    observeChildren()
    updateScrollState()

    return () => {
      container.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
      observer?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [updateScrollState])

  const scrollByPage = useCallback((direction: HorizontalScrollDirection) => {
    const container = containerRef.current
    if (!container) return
    container.scrollBy({
      left: direction * Math.max(160, container.clientWidth * 0.72),
      behavior: 'auto',
    })
  }, [])

  const resetScroll = useCallback(() => {
    if (containerRef.current) containerRef.current.scrollLeft = 0
    updateScrollState()
  }, [updateScrollState])

  return { containerRef, scrollState, scrollByPage, resetScroll }
}

function valueState<T>(value: T): SelectionStyleValue<T> {
  return { kind: 'value', value }
}

interface CreationStyleControlsProps {
  tool: ReturnType<typeof useAppStore.getState>['tool']
  brush: BrushType
  color: string
  fillColor: string
  size: number
  textDefaults: ReturnType<typeof useAppStore.getState>['textDefaults']
  onChange: (patch: SelectionStylePatch) => void
}

function CreationStyleControls({
  tool,
  brush,
  color,
  fillColor,
  size,
  textDefaults,
  onChange,
}: CreationStyleControlsProps) {
  if (tool === 'pen') {
    return (
      <>
        <BrushSelector brush={brush} setBrush={(next) => onChange({ brush: next })} visible />
        <ColorPicker
          colorValue={valueState(color)}
          sizeValue={valueState(size)}
          showFill={false}
          onChange={onChange}
        />
      </>
    )
  }

  if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
    return (
      <ColorPicker
        colorValue={valueState(color)}
        sizeValue={valueState(size)}
        fillColorValue={valueState(fillColor)}
        showFill={tool === 'rectangle' || tool === 'circle'}
        onChange={onChange}
      />
    )
  }

  if (tool === 'text') {
    return (
      <>
        <ColorPicker
          colorValue={valueState(color)}
          showSize={false}
          showFill={false}
          onChange={onChange}
        />
        <div className="tb-sep" role="separator" />
        <TextStyleControls
          fontSize={valueState(textDefaults.fontSize)}
          fontWeight={valueState(textDefaults.fontWeight)}
          fontStyle={valueState(textDefaults.fontStyle)}
          textDecoration={valueState(textDefaults.textDecoration)}
          textAlign={valueState(textDefaults.textAlign)}
          backgroundColor={valueState(textDefaults.backgroundColor ?? null)}
          onChange={onChange}
        />
      </>
    )
  }

  return null
}

export default function Toolbar({ canInstall = false, onInstall }: ToolbarProps) {
  const [historyPulse, setHistoryPulse] = useState<'undo' | 'redo' | null>(null)
  const pulseTimerRef = useRef<number | null>(null)
  const previousHistoryCountsRef = useRef<{ undoLen: number; redoLen: number } | null>(null)
  const {
    tool,
    setTool,
    brush,
    color,
    fillColor,
    size,
    textDefaults,
    activeTextEditingId,
    elements,
    layers,
    selectedIds,
    idToElement,
    applyStyle,
    copySelected,
    duplicateSelected,
    lockSelected,
    unlockSelected,
    removeElements,
    clearAll,
    undo,
    redo,
    undoLen,
    redoLen,
  } = useAppStore(
    useShallow((state) => ({
      tool: state.tool,
      setTool: state.setTool,
      brush: state.brush,
      color: state.color,
      fillColor: state.fillColor,
      size: state.size,
      textDefaults: state.textDefaults,
      activeTextEditingId: state.activeTextEditingId,
      elements: state.elements,
      layers: state.layers,
      selectedIds: state.selectedIds,
      idToElement: state.idToElement,
      applyStyle: state.applyStyle,
      copySelected: state.copySelected,
      duplicateSelected: state.duplicateSelected,
      lockSelected: state.lockSelected,
      unlockSelected: state.unlockSelected,
      removeElements: state.removeElements,
      clearAll: state.clearAll,
      undo: state.undo,
      redo: state.redo,
      undoLen: state.undoStack.length,
      redoLen: state.redoStack.length,
    }))
  )
  const toast = useToastStore((state) => state.show)
  const shortcutBindings = useShortcutStore((state) => state.bindings)
  const confirm = useConfirm()
  const centerScroll = useHorizontalToolbarScroll()

  const selectionStyle = useMemo(
    () => getSelectionStyleModel({ elements, layers, selectedIds, idToElement }),
    [elements, idToElement, layers, selectedIds]
  )
  const capabilities = useMemo(
    () => getSelectionCapabilities({ elements, layers, selectedIds, idToElement }),
    [elements, idToElement, layers, selectedIds]
  )
  const mode = activeTextEditingId ? 'text-editing' : selectedIds.length > 0 ? 'selection' : 'creation'

  useLayoutEffect(() => {
    centerScroll.resetScroll()
  }, [centerScroll.resetScroll, mode, tool])

  const shortcut = useCallback(
    (actionId: ShortcutActionId) => formatShortcutBinding(shortcutBindings[actionId]),
    [shortcutBindings]
  )
  const runStyle = useCallback(
    (patch: SelectionStylePatch) => {
      const message = getStyleCommandMessage(applyStyle(patch))
      if (message) toast(message, 'warning')
    },
    [applyStyle, toast]
  )

  const pulseHistoryButton = useCallback((kind: 'undo' | 'redo') => {
    if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current)
    setHistoryPulse(kind)
    pulseTimerRef.current = window.setTimeout(() => {
      setHistoryPulse(null)
      pulseTimerRef.current = null
    }, 360)
  }, [])

  useEffect(() => {
    const previous = previousHistoryCountsRef.current
    previousHistoryCountsRef.current = { undoLen, redoLen }
    if (!previous) return
    if (undoLen === previous.undoLen - 1 && redoLen === previous.redoLen + 1) {
      pulseHistoryButton('undo')
    } else if (redoLen === previous.redoLen - 1 && undoLen === previous.undoLen + 1) {
      pulseHistoryButton('redo')
    }
  }, [pulseHistoryButton, redoLen, undoLen])

  useEffect(
    () => () => {
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current)
    },
    []
  )

  const selectionControls = capabilities.isLocked ? (
    <>
      <span className="selection-count">已选择 {capabilities.count} 项</span>
      <button
        type="button"
        className="abtn"
        aria-label="复制"
        title="复制"
        onClick={copySelected}
      >
        <Copy size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="pill-btn ghost"
        aria-label="解锁"
        onClick={unlockSelected}
      >
        <Unlock size={15} aria-hidden="true" />
        <span>解锁</span>
      </button>
    </>
  ) : (
    <>
      <span className="selection-count">已选择 {capabilities.count} 项</span>
      {selectionStyle.brush.kind !== 'unsupported' && (
        <BrushSelector
          brush={selectionStyle.brush.kind === 'value' ? selectionStyle.brush.value : null}
          setBrush={(next) => runStyle({ brush: next })}
          visible
        />
      )}
      {selectionStyle.color.kind !== 'unsupported' && (
        <ColorPicker
          colorValue={selectionStyle.color}
          sizeValue={selectionStyle.size}
          fillColorValue={selectionStyle.fillColor}
          showSize={selectionStyle.size.kind !== 'unsupported'}
          showFill={selectionStyle.fillColor.kind !== 'unsupported'}
          onChange={runStyle}
        />
      )}
      {selectionStyle.fontSize.kind !== 'unsupported' && (
        <>
          <div className="tb-sep" role="separator" />
          <TextStyleControls
            fontSize={selectionStyle.fontSize}
            fontWeight={selectionStyle.fontWeight}
            fontStyle={selectionStyle.fontStyle}
            textDecoration={selectionStyle.textDecoration}
            textAlign={selectionStyle.textAlign}
            backgroundColor={selectionStyle.backgroundColor}
            onChange={runStyle}
          />
        </>
      )}
      <div className="tb-sep" role="separator" />
      <button
        type="button"
        className="abtn"
        aria-label="复制副本"
        title="复制副本"
        onClick={duplicateSelected}
      >
        <CopyPlus size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="abtn"
        aria-label="锁定"
        title="锁定"
        onClick={lockSelected}
      >
        <Lock size={15} aria-hidden="true" />
      </button>
      <ArrangeMenu capabilities={capabilities} />
      <button
        type="button"
        className="abtn danger-action"
        aria-label="删除选中内容"
        title="删除"
        onClick={() => removeElements(selectedIds)}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </>
  )

  return (
    <>
      <MobileToolbar />
      <MobileSelectionActions />
      <div
        className="sidebar panel"
        role="toolbar"
        aria-label="绘图工具"
        aria-orientation="vertical"
      >
        <ToolButtons tool={tool} setTool={setTool} />
        <div className="sb-sep" role="separator" />
        <div className="sb-group">
          <button
            onClick={undo}
            disabled={undoLen === 0}
            className={`abtn ${historyPulse === 'undo' ? 'history-pulse' : ''}`}
            data-tip={`撤销 ${shortcut('edit.undo')}`}
            aria-label="撤销"
          >
            {icons.undo}
          </button>
          <button
            onClick={redo}
            disabled={redoLen === 0}
            className={`abtn ${historyPulse === 'redo' ? 'history-pulse' : ''}`}
            data-tip={`重做 ${shortcut('edit.redo')}`}
            aria-label="重做"
          >
            {icons.redo}
          </button>
          <button
            onClick={async () => {
              await requestClearCanvas(elements.length, confirm, clearAll)
            }}
            className="abtn"
            data-tip="清空画布"
            aria-label="清空画布"
          >
            {icons.trash}
          </button>
        </div>
      </div>

      <div
        className="topbar panel"
        role="toolbar"
        aria-label="画布工具"
        aria-orientation="horizontal"
      >
        <div className="toolbar-fixed-start" role="group" aria-label="品牌">
          <div className="toolbar-brand" aria-label="MindNotes Pro">
            <div className="brand-icon" aria-hidden="true">
              M
            </div>
            <span className="brand-text">MindNotes Pro</span>
          </div>
        </div>

        <div className="toolbar-center-shell">
          {centerScroll.scrollState.canScrollBack && (
            <button
              type="button"
              className="toolbar-center-scroll-button toolbar-center-scroll-back"
              onClick={() => centerScroll.scrollByPage(-1)}
              aria-label="向左查看更多画布工具"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
          )}
          <div
            ref={centerScroll.containerRef}
            className="toolbar-center-scroll"
            role="group"
            aria-label="当前工具与选择"
          >
            {mode === 'text-editing' ? (
              <div className="toolbar-editing-status">
                <Type size={15} aria-hidden="true" />
                <span>正在编辑文字</span>
              </div>
            ) : mode === 'selection' ? (
              selectionControls
            ) : (
              <CreationStyleControls
                tool={tool}
                brush={brush}
                color={color}
                fillColor={fillColor}
                size={size}
                textDefaults={textDefaults}
                onChange={runStyle}
              />
            )}
          </div>
          {centerScroll.scrollState.canScrollForward && (
            <button
              type="button"
              className="toolbar-center-scroll-button toolbar-center-scroll-forward"
              onClick={() => centerScroll.scrollByPage(1)}
              aria-label="向右查看更多画布工具"
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="toolbar-fixed-end" role="group" aria-label="模板与文件">
          <TemplateMenu />
          <CanvasActionButtons canInstall={canInstall} onInstall={onInstall} />
          <ExportMenu />
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {mode === 'text-editing'
            ? '正在编辑文字'
            : mode === 'selection'
              ? `已选择 ${capabilities.count} 项`
              : `当前工具 ${tool}`}
        </span>
      </div>
    </>
  )
}
