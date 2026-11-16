# MindNotes Pro

**讲解时悬浮画线，阅读时随页批注，两类笔记都能保存和复用。**

v6.0.0-beta.12 从小悬浮按钮启动，展开即可在其他软件上批注。“我的笔记”统一查找屏幕批注与网页笔记；网页使用“浏览器原生层 + MindNotes Pro 批注图层”，批注随正文滚动。两类笔记都保存在本机。

[English](README.md) · [日本語](README_JA.md) · [复盘与交付说明](REFACTOR_NOTES_CN.md)

[中文使用指南](USAGE_CN.md) · [生产验收结果](PRODUCTION_READINESS_CN.md) · [发行包验收步骤](e2e/acceptance/README_CN.md)

## 当前交付

beta.12 修复实际 beta.11 exe 复现的两处反馈问题：网页导入写入失败仍提示成功；从旧副本恢复没有提醒最近修改可能缺失。导入现在等待写入完成，失败保留当前窗口的内容并提示导出备份；恢复提醒在本次使用中持续显示，存储错误不会被导出成功提示遮住。安装版和免安装版已生成并校验，实际 exe 的隐藏集成 8 项、存储故障恢复 8 项和异常恢复 10 项通过；34 项可见桌面流程尚未执行。当前证据与剩余门槛见[生产验收](PRODUCTION_READINESS_CN.md)。

- 主源码仅维护本仓库，beta.12 本地候选位于 `release/`，附 [校验值](release/SHA256SUMS-beta12.txt) 和 [候选说明](release/beta12-使用与验收说明.md)。beta.11 原包保留在 `release/beta11-candidate/release`，对应源码为 `release/beta11-candidate/build-source-beta11.zip`；旧版验收和原始文档见 [历史验收归档](tmp/qa/history/acceptance-through-beta11.zip)。
- 网站默认展示产品介绍；原白板保留在 `?mode=whiteboard`，原有 v5 数据协议保持独立。
- 本次网页批注运行在桌面应用内，尚不提供 Chrome / Edge 扩展。

## 悬浮批注

1. 启动后点击小悬浮按钮展开，拖动工具条到合适位置，选择画笔或荧光笔直接画线。
2. 橡皮删除碰到的整条笔迹；撤销、重做和可撤销的清空用于修正。
3. 点击“鼠标”或按 Esc 操作下层软件；点击“收起”隐藏笔迹、保留小悬浮按钮。Alt+Shift+M 可收起或展开，快捷键冲突时使用按钮。
4. 每次完成画线或擦除都会自动保存草稿，重启后展开恢复。需要固定课件画面时，在“更多”中点击“冻结画面”；按 Esc 会隐藏冻结图并操作实时软件，选画笔可继续标注冻结图。
5. 点击“保存笔记”，把原截图、独立可编辑笔迹、时间和来源一起存入笔记库。工具条自动避开截图，保存后返回鼠标模式。
6. “更多 → 我的笔记”打开统一笔记库；可搜索、补充结论、修改笔迹、导出 PNG / Markdown / JSON，或移入回收站后恢复。关闭笔记窗口或点击“悬浮批注”返回小按钮，“更多 → 退出”结束应用。

屏幕笔迹固定在屏幕坐标，不跟随下层窗口移动或正文滚动。移动工具条到另一块屏幕会切换到该屏幕独立草稿。普通桌面软件为目标范围；锁屏、UAC/受保护桌面及独占全屏存在系统限制。锁屏时不能保存截图；已完成笔迹仍保留。多显示器、触控、手写笔和不同系统的实机验收状态见 [生产验收](PRODUCTION_READINESS_CN.md)。

“来源”记录截图屏幕中央可见的软件窗口。整屏可能同时包含多个软件；来源不是整张截图的唯一归属。beta.6 桌面 24／24、两屏普通全屏、三个公开站及发行生命周期保留为历史通过记录，不能代替 beta.11 同包验收；具体范围见生产验收报告。

## 网页笔记

1. 粘贴 HTTP(S) 网页链接，打开真实网页。
2. 在“浏览”模式点击链接、滚动、选中文字；点击“摘录”保存选中的原文。
3. 用画笔、荧光笔或便签直接批注，右侧补充想法；按 Esc 返回浏览。
4. 批注随正文滚动，并根据 DOM / 文本锚点响应页面重排。重新打开网页恢复已有批注。
5. 回到“我的笔记”搜索，点击笔记回到来源；导出 Markdown 供语雀、Obsidian 等工具使用，或导出 JSON 备份继续编辑。

原文被改写、隐藏或无法唯一定位时，页面上会隐藏对应批注，右侧显示定位状态；摘录、评论和笔迹仍能编辑与导出，原文恢复后重新显示。已有内部滚动、SPA 与原节点复用回归，并在 MDN、JavaScript.info、菜鸟教程的公开文章完成实际验收。

需要随正文滚动、重新打开恢复的批注，请在此工作区打开网页。模板、图形排版和白板图层不进入新的桌面主界面。

## 数据与恢复

笔记自动写入 Electron 用户数据目录，常规 Windows 位置为 `%APPDATA%\mindnotes-pro`。屏幕笔记和草稿使用 `screen-notes.sqlite`；网页笔记使用 `page-notes.json`。免安装版同样使用本机用户数据目录。

- 屏幕数据由 SQLite Worker 串行事务保存，冻结图与草稿一起提交。WAL 与 FULL 同步保证已完成写入；自动保存状态明确显示，存储失败保留当前修改。
- 网页文件先写临时文件、同步落盘再替换；`.previous` 保留有效的上一次文件。从副本恢复会提示最近修改可能缺失。导入成功表示已完成本地写入；失败仍可导出当前窗口中的 JSON 或 Markdown。
- 输入立即进入待保存队列；连续编辑合并变更，窗口关闭和导航先等待保存。失败时阻止离开，提供重试、当前修改备份和原生确认的异常退出。
- 屏幕笔记格式为 `mindnotes-pro.screen-notes`，版本 `1`。JSON 包含原截图和可编辑笔迹；导入整份校验后合并，保留较新的本地修改。上限 256 MB、10,000 条笔记，每图 32 MB / 4,000 万像素；每笔记最多 1,000 条笔迹、16 万点。
- “备份与恢复”提供两类笔记的备份入口；悬浮条“更多”提供草稿备份与恢复。恢复非空草稿会确认替换，并先保留 `screen-draft-before-restore.json`。
- 摘录、批注和来源链接保存在本机；原网页没有离线快照，重新访问仍可能需要网络和登录。
- Markdown 保留原文摘录、文字评论和来源链接；完整笔迹及定位信息保存在 JSON。
- 网页笔记格式为 `mindnotes-pro.page-notes`，版本 `1`。导入按网址和批注 ID 合并，保留时间较新的编辑。
- 导入上限为 20 MB、2,000 个页面、合计 20,000 条批注。损坏或不支持的文件会报错，现有笔记不会因此被替换。
- 无账号、云同步和多人协作。换电脑请导出、传送并导入 JSON 备份。

旧白板使用当前浏览器来源的 `mindnotes-pro-v5` IndexedDB；只读迁移 v4，原数据库保留。旧白板 JSON 导入会替换当前唯一画板，与网页笔记的合并导入不同。

## 开发与打包

需要 Node.js `>=22.22.2` 和 npm。

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci --include=dev
npm run dev:desktop
```

| 命令                    | 用途                                                 |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | 在 localhost:3000 开发网站                           |
| `npm run dev:desktop`   | 同时运行 Vite 和 Electron 网页批注                   |
| `npm run check`         | ESLint、类型、模块边界、单元/真实存储测试与 Web 构建 |
| `npm run test:storage`  | SQLite/文件持久化、迁移、损坏保护与流式备份          |
| `npm run test:e2e`      | 网站及保留白板的 Chromium 流程                       |
| `npm run test:desktop`  | 生产构建后的真实 Electron 批注流程                   |
| `npm run build:windows` | Windows x64 安装版和免安装版，不发布                 |
| `npm run build:desktop` | 打包当前桌面平台                                     |
| `npm run test:coverage` | 原有单元测试覆盖率检查                               |

首次网页 E2E 前运行 `npx playwright install chromium`。Windows PowerShell 若全局设置了 production，请在测试进程中先设置 `$env:NODE_ENV = 'test'`；最终打包进程用 `$env:NODE_ENV = 'production'`。

输出位于 `release/`。beta.12 打包后，将 `MINDNOTES_EXECUTABLE` 设置为 `release/win-unpacked/MindNotes Pro.exe`，再运行 `npx playwright test --config=playwright.desktop.config.ts --output=tmp/qa/beta12-final-desktop/desktop`。桌面测试使用工作区内的独立临时数据目录，执行前协调输入时间。

根目录 `dist` 和 `dist-electron` 会随源码检查重建。本次清理移除了旧候选副本、重复依赖和过时输出；beta.2 Setup 仍供安装升级回归使用。历史 beta.11 报告保留原 hashes，隐藏 DOM／CDP 操作与生成样本不代表可见合成、实笔或持续输入验收。

新增 [10 项隐藏异常恢复验收](tmp/qa/hidden-crash-beta11-final.json) 通过：网页刷新、笔记窗口有限重载、继续编辑、单实例启动、批注层输入释放、工具条崩溃退出和精确重启；四个进程均正常退出。页面结果读取真实 preload 的批注订阅状态，隐藏动画帧绘制与自动布局不在本次通过范围内。

## 架构和边界

`src/notes` 包含纯数据模型、历史、屏幕与页面图层、统一库和编辑器；`electron/floatingController.mts` 负责悬浮窗口、草稿、鼠标穿透和截图；SQLite Worker 负责屏幕笔记，`electron/main.mts` 负责网页与生命周期。所有图层使用独立 preload 与可信 IPC 校验，原网页无 Node 访问权限；启用 sandbox 和 contextIsolation。详见 [ARCHITECTURE.md](ARCHITECTURE.md)。

跨域 iframe、虚拟列表和大幅改写原文仍有兼容边界。高漫 1060 Pro 有 beta.3 部分原生笔、擦除撤销、重启记录，用户已确认修复后的选项框不闪。beta.12 可见同包流程、实笔、发布者签名、Windows 10 和触控屏仍待验收，因此保留 beta。状态见 [PRODUCTION_READINESS_CN.md](PRODUCTION_READINESS_CN.md)，后续计划见 [ROADMAP.md](ROADMAP.md)。

贡献请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，安全问题见 [SECURITY.md](SECURITY.md)，版本变化见 [CHANGELOG.md](CHANGELOG.md)。

[MIT](LICENSE)
