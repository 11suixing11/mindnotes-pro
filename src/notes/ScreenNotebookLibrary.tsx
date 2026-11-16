import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  Image,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import type { PageNotebook } from './model'
import type { ScreenNotePage } from './screenNotebook'
import ScreenNoteEditor from './ScreenNoteEditor'
import './screenNotebook.css'

interface Props {
  pages: PageNotebook[]
  openPage(url: string): void
  pageBackupActions?: ReactNode
}

const PAGE_SIZE = 50
const EMPTY_PAGE: ScreenNotePage = { notes: [], total: 0, offset: 0 }

interface LibraryResult {
  query: string
  trash: boolean
  page: ScreenNotePage
}

interface LibraryRead {
  query: string
  trash: boolean
  offset: number
  pending: boolean
  error: string | null
}

export default function ScreenNotebookLibrary({ pages, openPage, pageBackupActions }: Props) {
  const bridge = window.mindnotesNotebook
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'screen' | 'page' | 'trash'>('all')
  const [offset, setOffset] = useState(0)
  const [version, setVersion] = useState(0)
  const [loadedResult, setResult] = useState<LibraryResult | null>(null)
  const [read, setRead] = useState<LibraryRead | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const trash = filter === 'trash'
  const result =
    loadedResult?.query === query && loadedResult.trash === trash ? loadedResult.page : EMPTY_PAGE
  const currentRead = read?.query === query && read.trash === trash && read.offset === offset
  const loading = !currentRead || read.pending
  const readError = currentRead ? read.error : null
  useEffect(() => bridge?.subscribe(() => setVersion((value) => value + 1)), [bridge])
  useEffect(() => {
    if (!bridge || filter === 'page') return
    let live = true
    const request = { query, trash: filter === 'trash', offset }
    setRead((previous) => ({
      ...request,
      pending: true,
      error:
        previous?.query === query && previous.trash === request.trash && previous.offset === offset
          ? previous.error
          : null,
    }))
    const timer = setTimeout(
      () => {
        void bridge
          .list(query, offset, filter === 'trash')
          .then((page) => {
            if (live) {
              const lastOffset = Math.max(0, Math.floor((page.total - 1) / PAGE_SIZE) * PAGE_SIZE)
              if (offset > lastOffset) {
                setOffset(lastOffset)
                return
              }
              setResult({ query, trash: request.trash, page })
              setRead({ ...request, pending: false, error: null })
            }
          })
          .catch((reason: unknown) => {
            if (live) {
              setRead({
                ...request,
                pending: false,
                error:
                  reason instanceof Error
                    ? reason.message.replace(
                        /^Error invoking remote method '[^']+': (?:Error: )?/,
                        ''
                      ) || '请重试读取。'
                    : '请重试读取。',
              })
            }
          })
      },
      query ? 150 : 0
    )
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [bridge, query, offset, filter, version])
  const visiblePages = pages.filter(
    (page) =>
      page.annotations.length &&
      `${page.title} ${page.url} ${page.annotations.map((annotation) => `${annotation.comment} ${annotation.quote?.exact ?? ''}`).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  const act = async (operation: () => Promise<unknown>, success: string) => {
    if (busy) return
    setBusy(true)
    try {
      const outcome = await operation()
      setMessage(
        outcome === null
          ? '已取消。'
          : typeof outcome === 'number'
            ? `已导入 ${outcome} 条笔记；较新的本地修改会保留。`
            : success
      )
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '操作失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  if (!bridge) return null
  if (active)
    return (
      <ScreenNoteEditor
        key={active}
        id={active}
        bridge={bridge}
        back={() => {
          setActive(null)
          setVersion((value) => value + 1)
        }}
      />
    )
  return (
    <section className="screen-notebook-library" aria-label="统一笔记库">
      <header className="screen-library-heading">
        <div>
          <h2>我的笔记</h2>
          <p>屏幕批注与网页笔记，保存在这台电脑。</p>
        </div>
        <details className="screen-library-backup">
          <summary className="notes-button">备份与恢复</summary>
          <div className="screen-library-actions">
            <button
              className="notes-button"
              disabled={busy}
              onClick={() => void act(() => bridge.importBackup(), '屏幕笔记备份已导入。')}
            >
              <Upload size={16} />
              导入屏幕备份
            </button>
            <button
              className="notes-button"
              disabled={busy}
              onClick={() => void act(() => bridge.exportAll(), '备份操作已完成。')}
            >
              <Upload size={16} />
              备份屏幕笔记
            </button>
            {pageBackupActions}
          </div>
        </details>
      </header>
      <div className="screen-library-filters">
        <div role="group" aria-label="笔记类型">
          {(
            [
              { value: 'all', name: '全部' },
              { value: 'screen', name: '屏幕批注' },
              { value: 'page', name: '网页笔记' },
              { value: 'trash', name: '回收站' },
            ] as const
          ).map(({ value, name }) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value)
                setOffset(0)
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <label>
          <Search size={17} />
          <input
            aria-label="搜索全部笔记"
            placeholder="搜索标题、来源或结论"
            value={query}
            maxLength={500}
            onChange={(event) => {
              setQuery(event.target.value)
              setOffset(0)
            }}
          />
        </label>
      </div>
      {message && (
        <div className="screen-library-message" role="alert">
          <span>{message}</span>
          <button onClick={() => setMessage(null)}>关闭提示</button>
        </div>
      )}
      {filter !== 'page' && readError && (
        <div className="screen-library-message" role="alert">
          <span>
            屏幕笔记暂时无法读取。{readError}
            {result.notes.length > 0 && ' 显示上次成功读取的屏幕笔记。'}
          </span>
          <button disabled={loading} onClick={() => setVersion((value) => value + 1)}>
            重试读取
          </button>
        </div>
      )}
      <div className="screen-library-grid" aria-busy={filter !== 'page' && loading}>
        {filter !== 'page' &&
          result.notes.map((note) => (
            <article className="screen-library-card" key={note.id}>
              <button
                className="screen-library-card-open"
                onClick={() => setActive(note.id)}
                aria-label={`打开屏幕笔记 ${note.title}`}
              >
                <div className="screen-library-thumbnail">
                  <img src={note.thumbnail} alt="" loading="lazy" />
                  <span>
                    <Image size={14} />
                    屏幕批注
                  </span>
                </div>
                <h3>{note.title}</h3>
                <p>{note.preview || '添加结论，或继续编辑笔迹。'}</p>
                <footer>
                  <span>
                    {note.source.app || '屏幕'} · {note.strokeCount} 条笔迹
                  </span>
                  <time>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</time>
                </footer>
              </button>
              <button
                className="screen-library-card-action"
                disabled={busy}
                aria-label={
                  filter === 'trash' ? `恢复屏幕笔记 ${note.title}` : `移到回收站 ${note.title}`
                }
                onClick={() =>
                  void act(
                    () =>
                      bridge.updateNote(note.id, {
                        trashedAt: filter === 'trash' ? null : Date.now(),
                      }),
                    filter === 'trash' ? '笔记已恢复。' : '笔记已移到回收站，可随时恢复。'
                  )
                }
              >
                {filter === 'trash' ? <RotateCcw size={16} /> : <Trash2 size={16} />}
              </button>
            </article>
          ))}
        {(filter === 'all' || filter === 'page') &&
          visiblePages.map((page) => (
            <article className="screen-library-card" key={page.url}>
              <button
                className="screen-library-card-open"
                onClick={() => openPage(page.url)}
                aria-label={`打开网页笔记 ${page.title}`}
              >
                <div className="screen-library-page">
                  <Globe2 size={30} />
                  <span>网页笔记</span>
                </div>
                <h3>{page.title}</h3>
                <p>
                  {page.annotations.find((annotation) => annotation.comment)?.comment ||
                    page.annotations.find((annotation) => annotation.quote)?.quote?.exact ||
                    page.url}
                </p>
                <footer>
                  <span>{page.annotations.length} 条批注</span>
                  <time>{new Date(page.updatedAt).toLocaleDateString('zh-CN')}</time>
                </footer>
              </button>
            </article>
          ))}
      </div>
      {(filter === 'page' || !result.notes.length) &&
        (!(filter === 'all' || filter === 'page') || !visiblePages.length) &&
        (filter === 'page' || !readError) && (
          <div className="screen-library-empty" role="status">
            {filter !== 'page' && loading
              ? '正在读取笔记…'
              : query
                ? '没有匹配的笔记。'
                : filter === 'trash'
                  ? '回收站是空的。'
                  : '点击悬浮条“保存笔记”，或打开网页开始记录。'}
          </div>
        )}
      {filter !== 'page' && result.total > PAGE_SIZE && (
        <div className="screen-library-pagination">
          <button
            disabled={loading || Boolean(readError) || result.offset === 0}
            onClick={() => setOffset(Math.max(0, result.offset - PAGE_SIZE))}
          >
            <ArrowLeft size={16} />
            上一页
          </button>
          <span>
            {result.offset + 1}–{Math.min(result.offset + PAGE_SIZE, result.total)} / {result.total}
          </span>
          <button
            disabled={loading || Boolean(readError) || result.offset + PAGE_SIZE >= result.total}
            onClick={() => setOffset(result.offset + PAGE_SIZE)}
          >
            下一页
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </section>
  )
}
