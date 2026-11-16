import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Eraser,
  FileJson,
  Globe2,
  Highlighter,
  Home,
  MousePointer2,
  PenLine,
  Plus,
  Quote,
  Redo2,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { ANNOTATION_COLORS, MAX_BACKUP_BYTES, normalizePageUrl, pageKey } from './model'
import type { AnnotationTool, PageAnnotation, PageNotebook } from './model'
import type { BrowserCommand, NotesBridge, NotesWorkspaceState } from './desktop'
import './notes.css'
import ScreenNotebookLibrary from './ScreenNotebookLibrary'

const INITIAL_STATE: NotesWorkspaceState = {
  pages: [],
  currentUrl: null,
  title: '',
  loading: false,
  canGoBack: false,
  canGoForward: false,
  canUndo: false,
  canRedo: false,
  tool: 'browse',
  color: '#e0a11b',
  activeAnnotationId: null,
  unresolvedAnnotationIds: [],
  saveState: 'saved',
  recoveryNotice: null,
  error: null,
}

const TOOLS = [
  { id: 'browse', label: '浏览', icon: MousePointer2 },
  { id: 'pen', label: '画笔', icon: PenLine },
  { id: 'highlight', label: '荧光笔', icon: Highlighter },
  { id: 'note', label: '便签', icon: StickyNote },
  { id: 'erase', label: '橡皮', icon: Eraser },
] as const

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function NoteCard({
  pageUrl,
  annotation,
  index,
  active,
  unresolved,
  bridge,
  onError,
}: {
  pageUrl: string
  annotation: PageAnnotation
  index: number
  active: boolean
  unresolved: boolean
  bridge: NotesBridge
  onError: (message: string) => void
}) {
  const [comment, setComment] = useState(annotation.comment)
  const [pendingUpdates, setPendingUpdates] = useState(0)
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!pendingUpdates) setComment(annotation.comment)
  }, [annotation.comment, pendingUpdates])
  useEffect(() => {
    if (active && annotation.kind === 'note' && !annotation.comment) input.current?.focus()
  }, [active, annotation.kind, annotation.comment])
  const label =
    annotation.kind === 'quote' ? '原文摘录' : annotation.kind === 'note' ? '页面便签' : '手写批注'
  return (
    <article
      className={`note-card${active ? ' is-active' : ''}`}
      style={{ '--note-color': annotation.color } as React.CSSProperties}
    >
      <div className="note-card-heading">
        <span className="note-number">{String(index + 1).padStart(2, '0')}</span>
        <span>{label}</span>
        <button
          className="notes-icon-button"
          title="定位原文"
          aria-label={`定位第 ${index + 1} 条批注`}
          disabled={unresolved}
          onClick={() =>
            void bridge.revealAnnotation(annotation.id).catch(() => onError('暂时无法定位原文。'))
          }
        >
          <ArrowUpRight size={15} />
        </button>
        <button
          className="notes-icon-button note-delete"
          title="删除批注"
          aria-label={`删除第 ${index + 1} 条批注`}
          onClick={() =>
            void bridge.deleteAnnotation(annotation.id).catch(() => onError('暂时无法删除批注。'))
          }
        >
          <Trash2 size={14} />
        </button>
      </div>
      {annotation.quote && <blockquote>{annotation.quote.exact}</blockquote>}
      {!annotation.quote && annotation.anchor?.text && (
        <p className="note-context">{annotation.anchor.text.slice(0, 100)}</p>
      )}
      {unresolved && (
        <p
          className="note-position-warning"
          role="status"
          aria-label={`第 ${index + 1} 条批注定位状态`}
        >
          原文位置暂时无法确认，页面上已隐藏此批注；笔记仍可编辑和导出。
        </p>
      )}
      <textarea
        ref={input}
        value={comment}
        maxLength={20_000}
        aria-label={`第 ${index + 1} 条批注的笔记`}
        placeholder="写下你的想法…"
        onChange={(event) => {
          const value = event.target.value
          setComment(value)
          setPendingUpdates((count) => count + 1)
          void bridge
            .updateAnnotation(pageUrl, annotation.id, value)
            .catch((error: unknown) => {
              onError(error instanceof Error ? error.message : '笔记暂时无法保存。')
            })
            .finally(() => setPendingUpdates((count) => count - 1))
        }}
        rows={2}
      />
    </article>
  )
}

function ExportMenu({
  bridge,
  hasNotes,
  scope,
  report,
}: {
  bridge: NotesBridge
  hasNotes: boolean
  scope: 'page' | 'all'
  report: (message: string) => void
}) {
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const exportNotes = async (format: 'markdown' | 'json') => {
    setOpen(false)
    try {
      const file = await bridge.exportNotes(format, scope)
      if (file) report('笔记已导出。')
    } catch (error) {
      report(error instanceof Error ? error.message : '导出失败，请重试。')
    }
  }
  return (
    <div className="notes-export" ref={menu}>
      <button
        className="notes-button"
        disabled={!hasNotes}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ArrowDownToLine size={15} />
        {scope === 'all' ? '导出全部' : '导出笔记'}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div role="menu" className="notes-export-menu">
          <button role="menuitem" onClick={() => void exportNotes('markdown')}>
            <BookOpen size={16} />
            <span>
              Markdown 笔记<small>在语雀、Obsidian 等工具中复用</small>
            </span>
          </button>
          <button role="menuitem" onClick={() => void exportNotes('json')}>
            <FileJson size={16} />
            <span>
              可编辑备份<small>包含批注位置，可导入继续编辑</small>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function HomeView({
  state,
  bridge,
  openPage,
  importNotes,
  report,
}: {
  state: NotesWorkspaceState
  bridge: NotesBridge
  openPage: (url: string) => void
  importNotes: () => void
  report: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const pages = state.pages.filter(
    (page) =>
      page.annotations.length &&
      `${page.title} ${page.url} ${page.annotations.map((annotation) => `${annotation.comment} ${annotation.quote?.exact || ''}`).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  return (
    <main className={`notes-home${window.mindnotesNotebook ? ' notes-home-desktop' : ''}`}>
      <section className="notes-home-intro">
        {window.mindnotesNotebook ? (
          <div className="notes-desktop-entry">
            <h1>记录之后，继续思考。</h1>
            <p>讲解时保存屏幕批注，阅读时让笔记跟随正文。</p>
          </div>
        ) : (
          <>
            <span className="notes-eyebrow">
              <span /> 阅读，让想法留下来
            </span>
            <h1>
              在网页上，
              <br />
              <em>记下你的想法。</em>
            </h1>
            <p>
              打开一篇文章，划出重点，写下批注。
              <br />
              保存摘录、批注与来源链接，下次阅读接着来。
            </p>
          </>
        )}
        <form
          className="notes-home-address"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            openPage(String(data.get('url') || ''))
          }}
        >
          <Globe2 size={19} />
          <input
            name="url"
            aria-label="要批注的网页地址"
            placeholder="粘贴网页链接，开始阅读"
            autoComplete="url"
            required
          />
          <button type="submit" className="notes-primary-button">
            打开网页
            <ArrowUpRight size={17} />
          </button>
        </form>
        {!window.mindnotesNotebook && (
          <div className="notes-home-hints">
            <span>
              <MousePointer2 size={14} />
              正常浏览
            </span>
            <span>
              <PenLine size={14} />
              随页批注
            </span>
            <span>
              <BookOpen size={14} />
              笔记复用
            </span>
          </div>
        )}
      </section>
      {window.mindnotesNotebook ? (
        <ScreenNotebookLibrary
          pages={state.pages}
          openPage={openPage}
          pageBackupActions={
            <>
              <button className="notes-button" onClick={importNotes}>
                <Upload size={15} />
                导入网页备份
              </button>
              <ExportMenu
                bridge={bridge}
                hasNotes={state.pages.some((page) => page.annotations.length)}
                scope="all"
                report={report}
              />
            </>
          }
        />
      ) : (
        <section className="notes-library" aria-label="我的网页笔记">
          <div className="notes-library-heading">
            <div>
              <h2>
                我的笔记 <span>{state.pages.filter((page) => page.annotations.length).length}</span>
              </h2>
              <p>保存在这台电脑，随时回到原文。</p>
            </div>
            <div className="notes-library-actions">
              <button className="notes-button" onClick={importNotes}>
                <Upload size={15} />
                导入备份
              </button>
              <ExportMenu
                bridge={bridge}
                hasNotes={state.pages.some((page) => page.annotations.length)}
                scope="all"
                report={report}
              />
            </div>
          </div>
          {state.pages.some((page) => page.annotations.length) && (
            <label className="notes-search">
              <Search size={15} />
              <input
                aria-label="搜索网页笔记"
                placeholder="搜索标题、原文或笔记"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          {pages.length ? (
            <div className="notes-page-grid">
              {pages.map((page: PageNotebook) => (
                <button
                  key={page.url}
                  className="notes-page-card"
                  onClick={() => openPage(page.url)}
                >
                  <div className="notes-page-card-top">
                    <Globe2 size={18} />
                    <span>{hostName(page.url)}</span>
                    <ArrowUpRight size={16} />
                  </div>
                  <h3>{page.title}</h3>
                  <p>
                    {page.annotations.find((annotation) => annotation.comment)?.comment ||
                      page.annotations.find((annotation) => annotation.quote)?.quote?.exact ||
                      '回到网页，继续阅读与批注。'}
                  </p>
                  <div className="notes-page-card-footer">
                    <span>{page.annotations.length} 条批注</span>
                    <time dateTime={new Date(page.updatedAt).toISOString()}>
                      {new Date(page.updatedAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="notes-library-empty">
              <BookOpen size={26} />
              <div>
                <strong>{query ? '没有找到匹配的笔记' : '第一篇笔记，从一个链接开始'}</strong>
                <p>{query ? '试试其他关键词。' : '上方粘贴网页地址，或者导入已有笔记。'}</p>
              </div>
            </div>
          )}
        </section>
      )}
      <footer className="notes-home-footer">
        <span>MindNotes Pro</span>
        <span>无需账号 · 本地保存 · 由你掌握</span>
      </footer>
    </main>
  )
}

export default function NotesApp() {
  const bridge = window.mindnotes
  const [state, setState] = useState(INITIAL_STATE)
  const [address, setAddress] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const viewport = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const report = useCallback(
    (value: string) =>
      setMessage(value.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')),
    []
  )
  useEffect(() => {
    if (!bridge) return
    let live = true
    void bridge
      .getState()
      .then((snapshot) => {
        if (live) setState(snapshot)
      })
      .catch(() => report('应用初始化失败，请重启。'))
    const unsubscribe = bridge.subscribe(setState)
    return () => {
      live = false
      unsubscribe()
    }
  }, [bridge, report])
  useEffect(() => {
    setAddress(state.currentUrl || '')
  }, [state.currentUrl])
  useEffect(() => {
    if (!bridge || !viewport.current || !state.currentUrl) {
      bridge?.setViewport(null)
      return
    }
    const node = viewport.current
    const resize = () => {
      const rect = node.getBoundingClientRect()
      bridge.setViewport({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }
    const observer = new ResizeObserver(resize)
    observer.observe(node)
    window.addEventListener('resize', resize)
    resize()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
      bridge.setViewport(null)
    }
  }, [bridge, state.currentUrl, panelOpen])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 5000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [message])
  const openPage = (url: string) => {
    if (!bridge) return
    try {
      const normalized = normalizePageUrl(url)
      void (window.mindnotesNotebook?.flushEdits() ?? Promise.resolve())
        .then(() => bridge.navigate(normalized))
        .catch((error: unknown) =>
          report(error instanceof Error ? error.message : '网页暂时无法打开。')
        )
    } catch (error) {
      report(error instanceof Error ? error.message : '网页地址无效。')
    }
  }
  const command = (value: BrowserCommand) => {
    void (
      value === 'force-quit'
        ? Promise.resolve()
        : (window.mindnotesNotebook?.flushEdits() ?? Promise.resolve())
    )
      .then(() => bridge?.command(value))
      .catch((error: unknown) =>
        report(error instanceof Error ? error.message : '操作失败，请重试。')
      )
  }
  const configure = (tool: AnnotationTool) => {
    void bridge?.configure(tool, state.color).catch(() => report('工具切换失败。'))
  }
  const currentPage = state.pages.find((page) => page.url === state.currentUrl)
  const activePage = Boolean(state.currentUrl)
  if (!bridge) return null
  return (
    <div className="notes-app">
      <header className="notes-header">
        <button
          className="notes-brand"
          aria-label="MindNotes Pro 我的笔记"
          onClick={() => command('home')}
        >
          <span className="notes-brand-mark">
            <PenLine size={21} />
          </span>
          <span>
            MindNotes<span className="notes-brand-pro">PRO</span>
          </span>
        </button>
        {activePage ? (
          <>
            <div className="notes-navigation">
              <button
                className="notes-icon-button"
                aria-label="后退"
                disabled={!state.canGoBack}
                onClick={() => command('back')}
              >
                <ArrowLeft size={17} />
              </button>
              <button
                className="notes-icon-button"
                aria-label="前进"
                disabled={!state.canGoForward}
                onClick={() => command('forward')}
              >
                <ArrowRight size={17} />
              </button>
              <button
                className={`notes-icon-button${state.loading ? ' is-loading' : ''}`}
                aria-label="刷新网页"
                onClick={() => command('reload')}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <form
              className="notes-address"
              onSubmit={(event) => {
                event.preventDefault()
                openPage(address)
              }}
            >
              <Globe2 size={15} />
              <input
                aria-label="网页地址"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onFocus={(event) => event.target.select()}
              />
              <button type="submit" aria-label="打开地址">
                <ArrowRight size={15} />
              </button>
            </form>
            <button className="notes-button notes-home-button" onClick={() => command('home')}>
              <Home size={15} />
              我的笔记
            </button>
          </>
        ) : (
          <span className="notes-header-description">屏幕批注与网页笔记</span>
        )}
        <button
          className="notes-button"
          onClick={() => command('floating')}
          title="返回覆盖其他软件的悬浮工具条"
        >
          <PenLine size={15} />
          悬浮批注
        </button>
        <span
          className={`notes-save-indicator${state.saveState === 'error' ? ' is-error' : ''}`}
          role="status"
          aria-label="笔记保存状态"
        >
          <span />
          {state.saveState === 'saved'
            ? '已保存在本地'
            : state.saveState === 'saving'
              ? '正在保存…'
              : '保存失败'}
        </span>
      </header>
      {!activePage ? (
        <HomeView
          state={state}
          bridge={bridge}
          openPage={openPage}
          importNotes={() => fileInput.current?.click()}
          report={report}
        />
      ) : (
        <>
          <div className="notes-workspace-toolbar">
            <div className="notes-tool-group" role="toolbar" aria-label="页面批注工具">
              {TOOLS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`notes-tool${state.tool === id ? ' is-selected' : ''}`}
                  aria-pressed={state.tool === id}
                  onClick={() => configure(id)}
                  title={id === 'browse' ? '正常浏览网页；Escape 返回浏览' : label}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <span className="notes-toolbar-divider" />
            <button
              className="notes-tool notes-quote-tool"
              onClick={() => {
                configure('browse')
                command('capture')
              }}
              title="先选中文字再摘录；Ctrl+Shift+S"
            >
              <Quote size={17} />
              <span>摘录</span>
            </button>
            <div className="notes-colors" role="group" aria-label="批注颜色">
              {ANNOTATION_COLORS.map((color, index) => (
                <button
                  key={color}
                  aria-label={['金色', '珊瑚红', '蓝色', '绿色'][index]}
                  aria-pressed={state.color === color}
                  onClick={() => void bridge.configure(state.tool, color)}
                >
                  <span style={{ backgroundColor: color }}>
                    {state.color === color && <Check size={12} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="notes-history">
              <button
                className="notes-icon-button"
                aria-label="撤销批注"
                disabled={!state.canUndo}
                onClick={() => command('undo')}
              >
                <Undo2 size={17} />
              </button>
              <button
                className="notes-icon-button"
                aria-label="重做批注"
                disabled={!state.canRedo}
                onClick={() => command('redo')}
              >
                <Redo2 size={17} />
              </button>
            </div>
            <button
              className={`notes-button notes-panel-toggle${panelOpen ? ' is-selected' : ''}`}
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen(!panelOpen)}
            >
              <BookOpen size={16} />
              笔记 <span>{currentPage?.annotations.length || 0}</span>
            </button>
          </div>
          <main className="notes-reading-workspace" aria-label="网页与批注笔记">
            <div ref={viewport} className="notes-browser-viewport" aria-label="原生网页浏览区域" />
            {panelOpen && (
              <aside className="notes-panel" aria-label="当前网页笔记">
                <div className="notes-panel-heading">
                  <span className="notes-eyebrow">READING NOTES</span>
                  <h2>{state.title || hostName(state.currentUrl || '')}</h2>
                  <p>{hostName(state.currentUrl || '')}</p>
                  <div>
                    <ExportMenu
                      bridge={bridge}
                      hasNotes={Boolean(currentPage?.annotations.length)}
                      scope="page"
                      report={report}
                    />
                    <button
                      className="notes-icon-button"
                      aria-label="收起笔记"
                      onClick={() => setPanelOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="notes-panel-content">
                  {currentPage?.annotations.length ? (
                    currentPage.annotations.map((annotation, index) => (
                      <NoteCard
                        pageUrl={currentPage.url}
                        key={`${pageKey(currentPage.url)}:${annotation.id}`}
                        annotation={annotation}
                        index={index}
                        active={state.activeAnnotationId === annotation.id}
                        unresolved={state.unresolvedAnnotationIds.includes(annotation.id)}
                        bridge={bridge}
                        onError={report}
                      />
                    ))
                  ) : (
                    <div className="notes-panel-empty">
                      <span>
                        <Plus size={23} />
                      </span>
                      <h3>读到这里，想到什么？</h3>
                      <p>
                        选中文字后点击「摘录」，
                        <br />
                        或者用画笔、便签直接记在页面上。
                      </p>
                      <small>批注随原文滚动，自动保存在本地。</small>
                    </div>
                  )}
                </div>
                <div className="notes-panel-footer">
                  <span />
                  {state.tool === 'browse'
                    ? '浏览模式 · 选中文字后可摘录'
                    : '批注模式 · 按 Esc 继续浏览'}
                </div>
              </aside>
            )}
          </main>
        </>
      )}
      {state.recoveryNotice && (
        <div className="notes-recovery-notice" role="status" aria-label="网页笔记恢复提示">
          {state.recoveryNotice}
        </div>
      )}
      <input
        ref={fileInput}
        className="notes-file-input"
        type="file"
        accept=".json,application/json"
        aria-label="导入笔记文件"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (file.size > MAX_BACKUP_BYTES) {
            report('笔记文件超过 20 MB。')
            return
          }
          void file
            .text()
            .then((content) => bridge.importNotes(content))
            .then(() => report('笔记已合并导入。'))
            .catch((error: unknown) =>
              report(error instanceof Error ? error.message : '导入失败，请检查文件。')
            )
        }}
      />
      {(message || state.error) && (
        <div className="notes-message" role="alert">
          <span>
            {state.error && <span>{state.error}</span>}
            {message && message !== state.error && <span>{message}</span>}
          </span>
          <button
            aria-label="关闭提示"
            onClick={() => {
              setMessage(null)
              if (state.error) command('reload')
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
