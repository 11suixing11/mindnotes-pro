import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  Globe2,
  Highlighter,
  PenLine,
} from 'lucide-react'
import './notes.css'

export default function NotesLanding() {
  return (
    <div className="notes-app notes-landing">
      <header className="notes-header">
        <a className="notes-brand" href="#">
          <span className="notes-brand-mark">
            <PenLine size={21} />
          </span>
          <span>
            MindNotes<span className="notes-brand-pro">PRO</span>
          </span>
        </a>
        <span className="notes-header-description">悬浮屏幕批注 · 网页笔记</span>
        <a className="notes-button" href="https://github.com/11suixing11/mindnotes-pro">
          GitHub
          <ArrowUpRight size={14} />
        </a>
      </header>
      <main className="notes-home">
        <section className="notes-home-intro">
          <span className="notes-eyebrow">
            <span /> 讲解和阅读，随时记录
          </span>
          <h1>
            在屏幕上，
            <br />
            <em>随时画出重点。</em>
          </h1>
          <p>
            一条悬浮工具条，覆盖正在使用的软件。
            <br />
            讲解时在屏幕上画线，阅读时让批注跟随网页；都能保存成可复用笔记。
          </p>
          <div className="notes-landing-actions">
            <a
              className="notes-primary-button"
              href="https://github.com/11suixing11/mindnotes-pro/releases"
            >
              <ArrowDownToLine size={17} />
              查看已发布版本
            </a>
            <a className="notes-button" href="?mode=whiteboard">
              打开原有白板
              <ArrowUpRight size={15} />
            </a>
          </div>
          <p className="notes-landing-availability">
            Windows 悬浮批注桌面版目前为测试版，安装包由维护者提供。
          </p>
          <div className="notes-home-hints">
            <span>
              <Check size={14} />
              无需账号
            </span>
            <span>
              <Check size={14} />
              批注自动恢复
            </span>
            <span>
              <Check size={14} />
              两类笔记统一查找
            </span>
          </div>
        </section>
        <section className="notes-landing-features" aria-label="核心功能">
          <article>
            <Globe2 size={24} />
            <h2>悬浮条，随时批注</h2>
            <p>置顶于浏览器、课件和桌面；画笔、荧光笔、整条擦除，切回鼠标操作下层软件。</p>
          </article>
          <article>
            <Highlighter size={24} />
            <h2>屏幕与笔迹，一起保存</h2>
            <p>自动保存草稿；将原截图、可编辑笔迹和结论存入笔记库，支持 PNG、Markdown 与备份。</p>
          </article>
          <article>
            <BookOpen size={24} />
            <h2>网页笔记，继续使用</h2>
            <p>在应用内打开真实网页，批注随正文滚动；摘录和评论自动保存，与屏幕笔记一起查找。</p>
          </article>
        </section>
        <footer className="notes-home-footer">
          <span>MindNotes Pro</span>
          <span>更少工具，更多思考。</span>
        </footer>
      </main>
    </div>
  )
}
