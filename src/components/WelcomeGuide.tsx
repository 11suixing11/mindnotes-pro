interface WelcomeGuideProps {
  onStart: () => void
}

const featureCards = [
  {
    icon: '🎨',
    title: '自由挥洒',
    description: '基于 tldraw 引擎，笔触流畅，画布无限延展。',
  },
  {
    icon: '🤖',
    title: 'AI 懂你',
    description: '一键图文识别与总结，让草图秒变结构化洞察。',
  },
  {
    icon: '⚡️',
    title: '极速轻量',
    description: '专注创作体验，告别臃肿 SaaS 的加载与等待。',
  },
]

export default function WelcomeGuide({ onStart }: WelcomeGuideProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-120px] h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute right-[-140px] top-[12%] h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute bottom-[-140px] left-[20%] h-80 w-80 rounded-full bg-slate-300/40 blur-3xl dark:bg-slate-700/30" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-12 pt-16 sm:px-10 lg:px-12">
        <div className="mb-10 w-fit rounded-full border border-slate-300/70 bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-600 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
          MindNotes Pro
        </div>

        <header className="max-w-4xl">
          <h1 className="text-balance bg-gradient-to-b from-slate-950 via-slate-700 to-slate-400 bg-clip-text text-5xl font-black leading-tight text-transparent sm:text-6xl md:text-7xl dark:from-white dark:via-slate-300 dark:to-slate-600">
            让灵感瞬间结构化
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            MindNotes Pro：集成了视觉大模型的轻量级协作白板。画出草图，剩下的交给 AI。
          </p>
        </header>

        <div className="mt-10">
          <button
            onClick={onStart}
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-9 py-5 text-lg font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.45)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,211,238,0.65)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-500/40"
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.35),transparent_55%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative">立即开始绘制 -&gt;</span>
          </button>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-300/70 bg-white/65 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/55"
            >
              <div className="text-2xl">{card.icon}</div>
              <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
