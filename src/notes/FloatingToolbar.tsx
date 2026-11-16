import { useEffect, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  Eraser,
  GripVertical,
  Highlighter,
  MoreHorizontal,
  MousePointer2,
  Pause,
  PenLine,
  Play,
  Power,
  Redo2,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { ANNOTATION_COLORS } from './model'
import type { FloatingCommand, FloatingState } from './floating'
import type { ScreenTool } from './screenInk'
import './floating.css'

const INITIAL: FloatingState = {
  tool: 'pointer',
  color: '#e05d52',
  size: 'medium',
  collapsed: true,
  capturing: false,
  count: 0,
  canUndo: false,
  canRedo: false,
  message: null,
  shortcutAvailable: true,
  frozen: false,
  recovered: false,
  saveState: 'saved',
  panel: null,
}

export default function FloatingToolbar() {
  const bridge = window.mindnotesFloating
  const [state, setState] = useState(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const reportError = (reason: unknown) =>
    setError(
      reason instanceof Error
        ? reason.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
        : '操作失败，请重试。'
    )
  useEffect(() => {
    if (!bridge) return
    const unsubscribe = bridge.subscribe((next) => {
      setState(next)
      setError(null)
    })
    void bridge
      .getState()
      .then(setState)
      .catch(() => setError('工具条无法加载，请退出重试。'))
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void bridge.command('pointer')
        void bridge.command('close-panel')
      }
    }
    window.addEventListener('keydown', escape)
    return () => {
      unsubscribe()
      window.removeEventListener('keydown', escape)
    }
  }, [bridge])
  const command = (value: FloatingCommand) => {
    void bridge?.command(value).catch(reportError)
  }
  const configure = (tool: ScreenTool, color = state.color, size = state.size) => {
    void bridge?.configure(tool, color, size).catch(reportError)
  }
  const shortcutHint = state.shortcutAvailable ? 'Alt+Shift+M' : '快捷键不可用 · 点击按钮操作'
  const mouseModeHint = state.mouseModeHidesInk ? '鼠标模式暂时隐藏笔迹，切回画笔立即恢复' : null
  const status =
    error ||
    state.message ||
    (state.capturing
      ? '正在保存…'
      : state.saveState === 'error'
        ? '自动保存失败，请打开更多重试'
        : state.saveState === 'saving'
          ? '正在保存草稿…'
          : state.tool === 'pointer' && mouseModeHint
            ? mouseModeHint
            : state.frozen
              ? state.tool === 'pointer'
                ? '冻结草稿已保存 · 画笔继续讲解'
                : '冻结画面 · Esc 操作实时软件'
              : state.tool === 'pointer'
                ? '操作下层软件 · 草稿已保存'
                : '实时屏幕 · Esc 返回鼠标')
  if (state.collapsed) {
    return (
      <main className="floating-toolbar-surface floating-collapsed">
        <button
          className="floating-bubble"
          aria-label="展开悬浮批注"
          title={`${state.recovered ? '上次批注已恢复 · 点击展开' : '展开悬浮批注'} · ${shortcutHint}`}
          onClick={() => command('expand')}
        >
          <PenLine size={25} />
          {(state.count > 0 || state.saveState === 'error') && (
            <span
              className={`floating-bubble-dot${state.saveState === 'error' ? ' is-error' : ''}`}
            />
          )}
        </button>
        <span className="floating-bubble-grip" title="拖动悬浮按钮">
          <GripVertical size={13} />
        </span>
      </main>
    )
  }
  return (
    <main className="floating-toolbar-surface">
      {state.panel && (
        <section
          className="floating-panel"
          aria-label={state.panel === 'brush' ? '画笔设置' : '更多操作'}
        >
          <header>
            <strong>{state.panel === 'brush' ? '画笔设置' : '更多操作'}</strong>
            <button
              className="floating-panel-close"
              aria-label="关闭工具面板"
              onClick={() => command('close-panel')}
            >
              <X size={18} />
            </button>
          </header>
          {state.panel === 'brush' ? (
            <>
              <div className="floating-brush-types">
                <button aria-pressed={state.tool === 'pen'} onClick={() => configure('pen')}>
                  <PenLine size={20} />
                  画笔
                </button>
                <button
                  aria-pressed={state.tool === 'highlight'}
                  onClick={() => configure('highlight')}
                >
                  <Highlighter size={20} />
                  荧光笔
                </button>
              </div>
              <div className="floating-colors" role="group" aria-label="屏幕画笔颜色">
                {ANNOTATION_COLORS.map((color, index) => (
                  <button
                    key={color}
                    aria-label={['金色', '红色', '蓝色', '绿色'][index]}
                    aria-pressed={state.color === color}
                    onClick={() =>
                      configure(state.tool === 'highlight' ? 'highlight' : 'pen', color)
                    }
                  >
                    <span style={{ backgroundColor: color }} />
                  </button>
                ))}
              </div>
              <div className="floating-widths" role="group" aria-label="屏幕画笔粗细">
                {(['thin', 'medium', 'thick'] as const).map((size, index) => (
                  <button
                    key={size}
                    aria-label={['细画笔', '中画笔', '粗画笔'][index]}
                    aria-pressed={state.size === size}
                    onClick={() =>
                      configure(state.tool === 'highlight' ? 'highlight' : 'pen', state.color, size)
                    }
                  >
                    <span style={{ width: 4 + index * 3, height: 4 + index * 3 }} />
                    {['细', '中', '粗'][index]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="floating-more-grid">
              <button
                disabled={!state.canRedo}
                onClick={() => command('redo')}
                aria-label="重做屏幕批注"
              >
                <Redo2 size={18} />
                重做
              </button>
              <button onClick={() => command(state.frozen ? 'live' : 'freeze')}>
                <>{state.frozen ? <Play size={18} /> : <Pause size={18} />}</>
                {state.frozen ? '返回实时画面' : '冻结画面'}
              </button>
              <button onClick={() => command('workspace')}>
                <BookOpen size={18} />
                我的笔记
              </button>
              <button disabled={!state.count} onClick={() => command('clear')}>
                <Trash2 size={18} />
                清空笔迹
              </button>
              <button onClick={() => command('export-draft')}>
                <Download size={18} />
                备份草稿
              </button>
              <button onClick={() => command('import-draft')}>
                <Upload size={18} />
                恢复草稿
              </button>
              <button onClick={() => command('quit')} aria-label="退出 MindNotes Pro">
                <Power size={18} />
                退出
              </button>
              {state.saveState === 'error' && (
                <button onClick={() => command('force-quit')}>异常退出</button>
              )}
            </div>
          )}
        </section>
      )}
      <div className="floating-toolbar" role="toolbar" aria-label="悬浮批注工具条">
        <span className="floating-drag-handle" title="拖动工具条">
          <GripVertical size={18} />
        </span>
        <button
          className={`floating-tool${state.tool === 'pointer' ? ' is-active' : ''}`}
          aria-pressed={state.tool === 'pointer'}
          disabled={state.capturing}
          onClick={() => configure('pointer')}
          title={
            mouseModeHint || (state.frozen ? '冻结画面时请先返回实时画面' : '操作下层软件 · Esc')
          }
        >
          <MousePointer2 size={20} />
          <span>鼠标</span>
        </button>
        <button
          className={`floating-tool${state.tool === 'pen' || state.tool === 'highlight' ? ' is-active' : ''}`}
          aria-pressed={state.tool === 'pen' || state.tool === 'highlight'}
          disabled={state.capturing}
          onClick={() => configure(state.tool === 'highlight' ? 'highlight' : 'pen')}
          title="画线"
        >
          <PenLine size={20} />
          <span>画笔</span>
        </button>
        <button
          className="floating-brush-toggle"
          aria-label="画笔设置"
          aria-expanded={state.panel === 'brush'}
          disabled={state.capturing}
          onClick={() => command(state.panel === 'brush' ? 'close-panel' : 'brush-panel')}
        >
          <ChevronDown size={16} />
        </button>
        <button
          className={`floating-tool${state.tool === 'erase' ? ' is-active' : ''}`}
          aria-pressed={state.tool === 'erase'}
          disabled={state.capturing}
          onClick={() => configure('erase')}
          title="删除碰到的整条笔迹"
        >
          <Eraser size={20} />
          <span>橡皮</span>
        </button>
        <button
          className="floating-tool"
          aria-label="撤销屏幕批注"
          disabled={!state.canUndo || state.capturing}
          onClick={() => command('undo')}
        >
          <Undo2 size={20} />
          <span>撤销</span>
        </button>
        <button
          className="floating-tool floating-save"
          disabled={state.capturing}
          onClick={() => command('save')}
          title="截图与可编辑笔迹自动进入我的笔记"
        >
          <Save size={20} />
          <span>保存笔记</span>
        </button>
        <button
          className="floating-tool"
          aria-label="更多操作"
          aria-expanded={state.panel === 'more'}
          disabled={state.capturing}
          onClick={() => command(state.panel === 'more' ? 'close-panel' : 'more-panel')}
        >
          <MoreHorizontal size={20} />
          <span>更多</span>
        </button>
        <button
          className="floating-tool"
          aria-label="收起悬浮批注"
          disabled={state.capturing}
          onClick={() => command('collapse')}
          title={`隐藏笔迹 · ${shortcutHint}`}
        >
          <ChevronUp size={20} />
          <span>收起</span>
        </button>
      </div>
      <div className={`floating-status${state.saveState === 'error' ? ' is-error' : ''}`}>
        <span className="floating-mode-label" role="status" title={status}>
          {status}
        </span>
        {state.saveState === 'error' ? (
          <button aria-label="重试自动保存" onClick={() => command('retry-save')}>
            <RotateCcw size={15} />
            重试
          </button>
        ) : (
          <span className="floating-shortcut" title={shortcutHint}>
            {state.shortcutAvailable ? 'Alt+Shift+M' : '快捷键不可用'}
          </span>
        )}
      </div>
    </main>
  )
}
