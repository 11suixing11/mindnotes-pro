import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowLeft,
  Download,
  Eraser,
  Highlighter,
  PenLine,
  Redo2,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import { ANNOTATION_COLORS } from './model'
import type { AnnotationColor, NotePoint } from './model'
import type { ScreenNote, ScreenNotePatch, ScreenNotebookBridge } from './screenNotebook'
import { validScreenStrokes } from './screenNotebook'
import {
  commitScreenHistory,
  emptyScreenHistory,
  MAX_SCREEN_POINTS,
  redoScreenHistory,
  screenEraserHitTest,
  screenStrokeWidth,
  undoScreenHistory,
} from './screenInk'
import type { ScreenBrushSize, ScreenHistory, ScreenStroke, ScreenTool } from './screenInk'
import './screenNotebook.css'
import ScreenInkPaths from './ScreenInkPaths'
import ScreenStrokePreview from './ScreenStrokePreview'
import type { ScreenStrokePreviewHandle } from './ScreenStrokePreview'

interface Props {
  id: string
  bridge: ScreenNotebookBridge
  back(): void
}

export default function ScreenNoteEditor({ id, bridge, back }: Props) {
  const [note, setNote] = useState<ScreenNote | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [history, setHistory] = useState<ScreenHistory>(emptyScreenHistory)
  const [tool, setTool] = useState<ScreenTool>('pen')
  const [color, setColor] = useState<AnnotationColor>('#e05d52')
  const [size, setSize] = useState<ScreenBrushSize>('medium')
  const preview = useRef<ScreenStrokePreviewHandle>(null)
  const clear = useCallback(() => preview.current?.clear(), [])
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [error, setError] = useState<string | null>(null)
  const noteRef = useRef<ScreenNote | null>(null)
  const historyRef = useRef(history)
  const titleRef = useRef('')
  const commentRef = useRef('')
  const queue = useRef(Promise.resolve())
  const revision = useRef(0)
  const saveFailed = useRef(false)
  const pendingCount = useRef(0)
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<{
    pointer: number
    stroke: ScreenStroke | null
    points: NotePoint[]
  } | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    let live = true
    void Promise.all([bridge.getNote(id), bridge.getImage(id)])
      .then(([saved, background]) => {
        if (!live) return
        noteRef.current = saved
        setNote(saved)
        setImage(background)
        setTitle(saved.title)
        setComment(saved.comment)
        titleRef.current = saved.title
        commentRef.current = saved.comment
        const next = { ...emptyScreenHistory(), present: saved.strokes }
        historyRef.current = next
        setHistory(next)
      })
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : '笔记无法读取。')
      })
    return () => {
      live = false
      mounted.current = false
    }
  }, [bridge, id])

  const update = (patch: ScreenNotePatch) => {
    const previous = noteRef.current
    if (!previous) return
    const generation = ++revision.current
    pendingCount.current += 1
    setStatus('saving')
    setError(null)
    // The preload combines pending edits and retains failed fields for the next retry.
    const snapshot = {
      ...patch,
      expectedRevision: previous.revision,
    }
    const pending = bridge
      .updateNote(id, snapshot)
      .then((saved) => {
        noteRef.current = { ...noteRef.current!, ...saved }
        if (mounted.current) {
          setNote(noteRef.current)
          if (generation === revision.current) {
            setStatus('saved')
            saveFailed.current = false
          }
        }
      })
      .catch((reason: unknown) => {
        if (generation !== revision.current) return
        saveFailed.current = true
        if (!mounted.current) return
        setStatus('error')
        setError(reason instanceof Error ? reason.message : '保存失败，修改仍保留在当前窗口。')
      })
      .finally(() => {
        pendingCount.current -= 1
      })
    queue.current = Promise.allSettled([queue.current, pending]).then(() => undefined)
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      )
        return
      if (event.key === 'Escape') {
        const current = gesture.current
        gesture.current = null
        clear()
        if (current && svg.current?.hasPointerCapture(current.pointer))
          svg.current.releasePointerCapture(current.pointer)
        setHidden(new Set())
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const next = event.shiftKey
          ? redoScreenHistory(historyRef.current)
          : undoScreenHistory(historyRef.current)
        if (next !== historyRef.current) {
          historyRef.current = next
          setHistory(next)
          update({ strokes: next.present })
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })

  const commit = (next: ScreenHistory) => {
    historyRef.current = next
    setHistory(next)
    update({ strokes: next.present })
  }
  const position = (event: { clientX: number; clientY: number }): NotePoint => {
    const rect = svg.current?.getBoundingClientRect()
    const currentNote = noteRef.current
    if (!rect || !currentNote) return { x: 0, y: 0 }
    return {
      x: Math.max(
        0,
        Math.min(currentNote.width, ((event.clientX - rect.x) * currentNote.width) / rect.width)
      ),
      y: Math.max(
        0,
        Math.min(currentNote.height, ((event.clientY - rect.y) * currentNote.height) / rect.height)
      ),
    }
  }
  const cancel = () => {
    const current = gesture.current
    gesture.current = null
    clear()
    if (current && svg.current?.hasPointerCapture(current.pointer))
      svg.current.releasePointerCapture(current.pointer)
    setHidden(new Set())
  }
  const erasePreview = (points: NotePoint[]) => {
    const hit = screenEraserHitTest(points)
    setHidden((previous) => {
      const next = new Set(previous)
      for (const stroke of historyRef.current.present)
        if (!next.has(stroke.id) && hit(stroke)) next.add(stroke.id)
      return next
    })
  }
  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (
      event.button !== 0 ||
      gesture.current ||
      !note ||
      (event.pointerType === 'touch' && !event.isPrimary)
    )
      return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A cancelled device contact may disappear before capture is acquired.
      return
    }
    const point = position(event)
    if (tool === 'erase') {
      gesture.current = { pointer: event.pointerId, stroke: null, points: [point] }
      erasePreview([point])
    } else {
      const stroke: ScreenStroke = {
        id: crypto.randomUUID(),
        tool: tool === 'highlight' ? 'highlight' : 'pen',
        color,
        width: screenStrokeWidth(tool, size),
        points: [point],
      }
      gesture.current = { pointer: event.pointerId, stroke, points: stroke.points }
      preview.current?.begin(stroke)
    }
  }
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (
      !current ||
      current.pointer !== event.pointerId ||
      current.points.length >= MAX_SCREEN_POINTS
    )
      return
    const point = position(event)
    const last = current.points[current.points.length - 1]
    if (Math.hypot(point.x - last.x, point.y - last.y) < 1) return
    current.points.push(point)
    if (current.stroke) preview.current?.append(current.stroke)
    else erasePreview(current.points.slice(-2))
  }
  const finish = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId) return
    const end = position(event)
    const last = current.points[current.points.length - 1]
    if (current.points.length < MAX_SCREEN_POINTS && (end.x !== last.x || end.y !== last.y))
      current.points.push(end)
    const present = historyRef.current.present
    const hit = screenEraserHitTest(current.points)
    const next = current.stroke
      ? [...present, current.stroke]
      : present.filter((stroke) => !hit(stroke))
    cancel()
    if (!validScreenStrokes(next)) {
      setError('这条笔迹超过当前笔记的容量，请先导出备份或擦除部分笔迹。')
      return
    }
    if (current.stroke || next.length !== present.length)
      commit(commitScreenHistory(historyRef.current, next))
  }
  const exportNote = async (format: 'png' | 'json' | 'markdown') => {
    await queue.current
    if (saveFailed.current) return
    try {
      await bridge.exportNote(id, format)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '导出失败，请重试。')
    }
  }
  const leave = async () => {
    await queue.current
    if (!saveFailed.current) back()
  }
  const exportRecovery = async () => {
    if (!noteRef.current || !image) return
    try {
      const saved = await bridge.exportRecovery(
        {
          ...noteRef.current,
          title: title.trim() || noteRef.current.title,
          comment,
          strokes: history.present,
          updatedAt: Math.max(Date.now(), noteRef.current.updatedAt + 1),
          revision: noteRef.current.revision + 1,
        },
        image
      )
      if (saved) setError('当前修改已导出为恢复备份，可在笔记库中导入。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '恢复备份导出失败，请选择可写目录。')
    }
  }
  if (!note || !image)
    return (
      <section className="screen-note-editor">
        <button className="notes-button" onClick={back}>
          <ArrowLeft size={16} />
          返回笔记
        </button>
        <p role="status">{error || '正在打开笔记…'}</p>
      </section>
    )
  return (
    <section className="screen-note-editor" aria-label="屏幕笔记编辑器">
      <header className="screen-note-heading">
        <button className="notes-button" onClick={() => void leave()}>
          <ArrowLeft size={16} />
          返回笔记
        </button>
        <input
          aria-label="屏幕笔记标题"
          value={title}
          maxLength={200}
          onChange={(event) => {
            setTitle(event.target.value)
            titleRef.current = event.target.value
            if (event.target.value.trim()) update({ title: event.target.value })
          }}
          onBlur={() => {
            if (!titleRef.current.trim()) {
              titleRef.current = noteRef.current?.title || '屏幕笔记'
              setTitle(titleRef.current)
            }
          }}
        />
        <span role="status" aria-label="屏幕笔记保存状态">
          {status === 'saved' ? '已保存' : status === 'saving' ? '正在保存…' : '保存失败'}
        </span>
      </header>
      {error && (
        <div className="screen-note-error" role="alert">
          <span>{error}</span>
          <button
            onClick={() =>
              update({ title: title || note.title, comment, strokes: history.present })
            }
          >
            <RotateCcw size={16} />
            重试保存
          </button>
          {status === 'error' && (
            <button onClick={() => void exportRecovery()}>
              <Download size={16} />
              当前修改备份
            </button>
          )}
          {status === 'error' && (
            <button onClick={() => void window.mindnotes?.command('force-quit')}>异常退出</button>
          )}
        </div>
      )}
      <div className="screen-note-body">
        <div className="screen-note-visual">
          <div className="screen-note-tools" role="toolbar" aria-label="笔记笔迹工具">
            {(
              [
                { value: 'pen', name: '画笔', icon: PenLine },
                { value: 'highlight', name: '荧光笔', icon: Highlighter },
                { value: 'erase', name: '橡皮', icon: Eraser },
              ] as const
            ).map(({ value, name, icon: Icon }) => (
              <button
                key={value}
                aria-pressed={tool === value}
                onClick={() => {
                  cancel()
                  setTool(value)
                }}
              >
                <Icon size={19} />
                {name}
              </button>
            ))}
            <button
              aria-label="撤销笔记笔迹"
              disabled={!history.past.length}
              onClick={() => commit(undoScreenHistory(historyRef.current))}
            >
              <Undo2 size={19} />
            </button>
            <button
              aria-label="重做笔记笔迹"
              disabled={!history.future.length}
              onClick={() => commit(redoScreenHistory(historyRef.current))}
            >
              <Redo2 size={19} />
            </button>
            <select
              aria-label="笔记画笔颜色"
              value={color}
              onChange={(event) => setColor(event.target.value as AnnotationColor)}
            >
              {ANNOTATION_COLORS.map((item, index) => (
                <option key={item} value={item}>
                  {['金色', '红色', '蓝色', '绿色'][index]}
                </option>
              ))}
            </select>
            <select
              aria-label="笔记画笔粗细"
              value={size}
              onChange={(event) => setSize(event.target.value as ScreenBrushSize)}
            >
              {(['thin', 'medium', 'thick'] as const).map((item, index) => (
                <option key={item} value={item}>
                  {['细', '中', '粗'][index]}
                </option>
              ))}
            </select>
          </div>
          <div className="screen-note-stage">
            <svg
              ref={svg}
              viewBox={`0 0 ${note.width} ${note.height}`}
              aria-label="可编辑截图批注"
              style={{ aspectRatio: `${note.width}/${note.height}` }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={(event) => {
                if (gesture.current?.pointer === event.pointerId) cancel()
              }}
              onLostPointerCapture={(event) => {
                if (
                  gesture.current?.pointer === event.pointerId &&
                  !event.currentTarget.hasPointerCapture(event.pointerId)
                )
                  cancel()
              }}
            >
              <image href={image} width={note.width} height={note.height} />
              <ScreenInkPaths strokes={history.present} hidden={hidden} />
              <ScreenStrokePreview ref={preview} strokes={history.present} />
            </svg>
          </div>
        </div>
        <aside className="screen-note-details">
          <label>
            记录结论
            <textarea
              aria-label="屏幕笔记结论"
              rows={7}
              maxLength={20_000}
              value={comment}
              placeholder="写下这张图的重点，之后更容易找到。"
              onChange={(event) => {
                setComment(event.target.value)
                commentRef.current = event.target.value
                update({ comment: event.target.value })
              }}
            />
          </label>
          <dl>
            <dt>来源</dt>
            <dd>
              {note.source.app || '屏幕'}
              {note.source.title && ` · ${note.source.title}`}
            </dd>
            <dt>保存时间</dt>
            <dd>{new Date(note.createdAt).toLocaleString('zh-CN')}</dd>
            <dt>笔迹</dt>
            <dd>{history.present.length} 条 · 可以继续编辑</dd>
          </dl>
          <div className="screen-note-exports">
            <button onClick={() => void exportNote('png')}>
              <Download size={17} />
              导出 PNG
            </button>
            <button onClick={() => void exportNote('json')}>
              <Download size={17} />
              可编辑备份
            </button>
            <button onClick={() => void exportNote('markdown')}>
              <Download size={17} />
              Markdown 结论
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
