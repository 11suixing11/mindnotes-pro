# 先名后利 - 30天执行清单

## Week 0: 仓库整容 (已完成 60%)

### GitHub 设置
- [ ] 进入 Settings > General > About
  Description: `🎨 Local-first whiteboard — no account, offline PWA, MIT. 183kB gzip. Data stays in your browser.`
  Website: `https://11suixing11.github.io/mindnotes-pro`
  Topics: `whiteboard, local-first, offline-first, pwa, react, typescript, canvas, excalidraw-alternative, privacy, mit, drawing, mindmap, tldraw-alternative`
- [ ] 上传 Social Preview: 1280x640，用 `.github/mindnotes-pro-v5.png` 加文字 "No Cloud. No Account. Just Draw."
- [ ] Pin Discussions #97 到首页

### README 已更新
- [x] 英文 README 加入真实 bundle 数据和 tldraw 收费背景
- [x] 中文 README 同步
- [ ] 日文 README 同步（可选）

### Demo 录制脚本 (15s GIF 必做)
1. 打开 https://11suixing11.github.io/mindnotes-pro (空白画布)
2. 画 2 笔 + 1 个矩形 + 1 个箭头 (3s)
3. 打开 Templates 插入流程图 (3s)
4. 选中导出 PNG/PDF (3s)
5. 展示离线：DevTools Offline 刷新仍可用 (3s)
工具：ScreenToGif / LICEcap，输出 <3MB，放到 README 顶部

## Week 1: 中文冷启动

### Day 1-2: V2EX
- 节点：/share
- 标题：`做了一个本地优先白板，想听真实反馈：你会不会真的用？`
- 正文：直接用 `.github/promotion-copy-cn.md`，结尾加：`先名后利，现阶段只求真实反馈，不求 star`
- 回复策略：每条评论 2h 内回，不争辩，记录痛点到 GitHub Issue

### Day 3-4: 掘金
- 标题：`tldraw 收费后，我用 MIT 协议做了一个 183kB 的本地白板`
- 标签：前端, 开源, React, TypeScript, 白板
- 内容：架构 + 为什么单板 + IndexedDB + PWA，附 bundle 实测截图
- 钩子：评论区抽 3 人送 Pro Waitlist 早鸟

### Day 5: 即刻/微博
- 用 `.github/promo-04-jike-weibo.html` 截图，短文案：`无账号白板，数据不出浏览器，离线可用，MIT。求毒舌反馈。`

## Week 2: 英文冷启动

### Day 8: Hacker News (周二 9:00 AM ET)
- Title: `Show HN: MindNotes Pro – Local-first whiteboard, no account, offline PWA, MIT`
- Body: 用 `.github/promotion-copy.md` 诚实版，禁止提 Miro 替代
- 准备：提前 1h 打开 HN，准备回答 10 个预设问题（见下方）

### Day 10: Reddit
- r/webdev 标题：`I built a local-first whiteboard that works offline after first load – looking for brutal feedback`
- r/reactjs 标题：`MindNotes Pro – React 19 + Zustand + Canvas, 183kB gzip first paint, 100% local`
- 必须：每个帖子手动回 5 条以上评论

### Day 12: Twitter Thread
- 8 条，带 GIF，@ 一下 Excalidraw 和 tldraw 官方（礼貌提及，不是碰瓷）
- 结尾：`Feedback thread: github.com/11suixing11/mindnotes-pro/discussions/97`

## Week 3-4: 放大

- [ ] 提 5 个 Awesome Lists PR
- [ ] 写对比文：`Excalidraw vs tldraw vs MindNotes Pro – which MIT whiteboard after tldraw went paid?`
- [ ] Product Hunt 草稿：Tagline `A whiteboard that works offline – no cloud, no signup`
- [ ] 整理 20 条用户反馈，分类：`必须做 / 不该做 / Pro 预埋`

## HN 预设回答库

Q: How is this different from Excalidraw?
A: Excalidraw is 90k stars, collaboration-focused. MindNotes is single-board, private scratchpad, 183kB first paint, intentionally no collab. Different use case.

Q: Why not just use Excalidraw?
A: If you need collab, use Excalidraw. If you need a <1s private scratchpad that never phones home, try this.

Q: Bundle size?
A: First paint 183kB gzip, jspdf lazy-loaded. Measured with vite build, not marketing number.

Q: Monetization?
A: Core will stay MIT. Exploring local-only Pro features (version history, encrypted vault) – no cloud required. No plans for now, focusing on feedback.

## 止损

- 30 天 <200 stars：暂停产品功能，全力写 3 篇技术博客，用技术换 star
- 30 天 200-800 stars：继续，按 W5-W8 执行
- 30 天 >800 stars：启动 Product Hunt + Pro Waitlist
