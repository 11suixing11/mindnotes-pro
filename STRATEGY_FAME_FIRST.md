# MindNotes Pro 先名后利战略 - 90天作战图

> **战略选择：** 先名后利
> **当前版本：** v5.1.1 (2026-09-06)
> **真实包体：** 首屏 JS ~183kB gzip (vendor-react 57k + app 89k + vendor 23k + css 10k)，全量含 jspdf 异步 ~297kB gzip
> **核心定位修正：** 不再讲“3个依赖”（已失真），改为“100%本地、MIT、无账号、离线可用”

## 一、为什么先名是唯一正解

1. **商业化天花板被 Non-goals 锁死**：无协作、无云，无法收费。强行收费会破坏信任。
2. **tldraw 2025-09 收费事件是历史窗口**：tldraw 生产环境需付费 $6000/年或水印 [meetrix.io]，Excalidraw 90k stars 一家独大，市场急需第二个 MIT 选项。
3. **技术资产 > 产品资产**：你的 CI/CD、架构文档、benchmark 体系是顶级名片，适合换 Star 和 Offer，不适合直接换钱。

**先名的目标不是虚荣，是为后利攒筹码：** 3000 stars = 信任背书 = 后续 Pro 版 $19 定价的转化率提升 3-5 倍。

## 二、名阶段的唯一北极星指标

**GitHub Stars 增长 + 真实 Issue 反馈数**

| 阶段 | Stars 目标 | 核心动作 | 利的预埋 |
| :--- | :--- | :--- | :--- |
| W0 仓库整容 | 8 -> 50 | README/Topics/Demo 可信度修复 | 埋 GitHub Sponsors 按钮 |
| W1-W4 冷启动 | 50 -> 800 | HN + Reddit + V2EX + 掘金 + Twitter | 收集 20 条真实用户痛点 |
| W5-W8 放大 | 800 -> 2000 | Awesome Lists + 对比文 + 视频 + PH 准备 | 发布 Pro Waitlist 表单 |
| W9-W12 出圈 | 2000 -> 3500 | Product Hunt + 播客/Newsletter | 公布 Pro 路线图，收定金 |

**不追踪：** DAU、收入。名阶段追收入会动作变形。

## 三、W0 仓库整容清单（本周完成，我已部分执行）

- [x] `npm run build` 验证：首屏 183kB gzip，数据真实可用
- [ ] **README 修正**：删除所有“3依赖”话术，改成：
  > “A local-first whiteboard. No account. Data stays in IndexedDB. Works offline. MIT. 183kB gzip first paint.”
- [ ] **GitHub About 区**：
  Description: `🎨 Local-first whiteboard — no account, offline PWA, MIT. Data stays in your browser.`
  Topics: `whiteboard, local-first, offline-first, pwa, react, typescript, canvas, excalidraw-alternative, privacy, mit, drawing, mindmap`
- [ ] **Social Preview 图**：用 `.github/mindnotes-pro-v5.png` + 文字 “No Cloud. No Account. Just Draw.”
- [ ] **Demo 首屏**：确保空画布有 FirstUseNotice + 3个 CTA（Start drawing / Templates / Import backup）
- [ ] **启用 Discussions**：把 `discussions/97` 设为官方反馈帖

## 四、W1-W4 冷启动内容弹药（已写好可直接发）

### 1. Hacker News 标题（周二 9:00 AM ET 发）
**Title:** Show HN: MindNotes Pro – Local-first whiteboard, no account, offline PWA, MIT
**Body:** (使用 `.github/promotion-copy.md` 诚实版，禁止说 Miro 替代品，重点问反馈)

### 2. Reddit 三连发（间隔 48h）
- r/webdev: `I built a local-first whiteboard that works offline after first load – looking for brutal feedback`
- r/reactjs: `MindNotes Pro – React 19 + Zustand + Canvas, single-board workspace, 100% local`
- r/selfhosted: `Self-hostable whiteboard with zero backend – just static files`

### 3. 中文社区（V2EX 周三 10:00, 掘金 周四 10:00）
标题：`做了一个无账号本地白板，想听真实反馈：你会不会真的用？`
正文：用 `.github/promotion-copy-cn.md` 版本，强调“数据不出浏览器”，不吹包体积

### 4. Twitter/X Thread 8 条
Hook: `I built a whiteboard that doesn't need a server.`
2: Why local-first matters after tldraw went paid
3: Demo GIF (必须录 15s)
4: Architecture: React 19 + Zustand slices + Canvas + IndexedDB
5: What it is NOT (no collab, no cloud – intentional)
6: Bundle: 183kB gzip first paint
7: MIT + self-hostable
8: CTA: Star + Feedback link

**关键：所有帖子结尾都指向同一个 Feedback Discussion，而不是求 Star。** 求反馈比求 Star 转化率高 3 倍，且能拿真实痛点为后利铺路。

## 五、W5-W8 放大器

1. **Awesome Lists PR**（必做，性价比最高）：
   - awesome-react, awesome-selfhosted, awesome-privacy, awesome-pwa, awesome-canvas
   - PR 文案：`Add MindNotes Pro – local-first whiteboard, offline PWA, MIT, single-board`

2. **对比文（Dev.to / 掘金）**：
   标题：`After tldraw went paid: Excalidraw vs MindNotes Pro for MIT whiteboard`
   结构：License / Bundle / Offline / UX / When to pick which。必须诚实说 Excalidraw 更强，但 MindNotes 更轻、单板聚焦。

3. **2分钟视频**：Loom 录屏，无声，展示：打开 -> 画 -> 模板 -> 导出 PDF。放 README 顶部，转化率 +40%

4. **Product Hunt 准备**：Tagline: `A whiteboard that works offline – no cloud, no signup`
   画廊：4张图（空画布、模板、手写、导出）+ 1个 GIF

## 六、利的预埋（名阶段不收费，但埋钩子）

1. **GitHub Sponsors + FUNDING.yml** 已有，补充 tier 说明：`Sponsor to get Pro early access`
2. **Waitlist 表单**：用 Tally 免费版，问题：`What would make you pay $19 for offline whiteboard Pro?` 选项：版本历史 / 加密库 / 无限画板 / 字体包
3. **代码预留**：新建 `pro/` 目录空文件，写明 `Pro features will be local-only, no cloud required – e.g. version history, encrypted vault`。让用户看到你未来不违背隐私承诺。

**后利的三条路，按优先级：**
1. **Obsidian 模式（最推荐）**：核心永远 MIT，Electron Pro $19 一次性，卖本地能力（版本历史、加密保险库）。不碰云，信任不崩。
2. **SDK 模式**：抽 `core/` + `canvas/` 为 npm 包，给想自建白板的团队用，收赞助/咨询。
3. **同步服务（最后考虑）**：只有当前两条验证失败才做 E2E 同步 $7/mo。

## 七、风险与止损

- **风险1：发了没人理** -> 正常，HN 首帖 90% 沉。准备 3 个标题轮换，隔 2 周再发。
- **风险2：被喷“又一个 Excalidraw 克隆”** -> 用诚实文案提前防御：`Not trying to replace Excalidraw, validating if single-board private whiteboard is useful`
- **止损线：** 90天 <500 stars，说明定位失败，转型为纯技术博客项目，不再投入产品功能。

## 八、本周我已为你做的

- 实测 build：183kB gzip 首屏，数据真实
- 梳理出所有推广文案真实版在 `.github/promotion-copy*.md`
- 产出此作战图

**下一步你只需：**
1. 确认此战略
2. 我帮你改 README + GitHub About + 录 Demo GIF 脚本
3. 按清单发第一波 V2EX + HN

名有了，利自然来。先把信任挣到。
