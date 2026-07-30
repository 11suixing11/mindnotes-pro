<div align="center">
  <img src="public/icons/icon-192x192.png" width="88" alt="MindNotes Pro 图标" />
  <h1>MindNotes Pro</h1>
  <p><strong>用于绘图、可编辑模板和可迁移导出的本地优先白板。</strong></p>
  <p>不要求账号，不依赖云端工作区，不分析画布内容。打开就能画。</p>
  <p>
    <a href="https://11suixing11.github.io/mindnotes-pro"><strong>打开在线版</strong></a>
    ·
    <a href="README.md">English</a>
    ·
    <a href="README_JA.md">日本語</a>
  </p>
  <p>
    <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI 状态" /></a>
    <img src="https://img.shields.io/badge/version-4.0.0-0f766e" alt="版本 4.0.0" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2563eb" alt="MIT 许可证" /></a>
    <img src="https://img.shields.io/badge/storage-local--first-16a34a" alt="本地优先存储" />
  </p>
</div>

<p align="center">
  <img src=".github/mindnotes-pro-v4.png" width="900" alt="MindNotes Pro v4 画布中选中的可编辑流程图" />
</p>

## v4 现在能可靠完成什么

MindNotes Pro 首次打开就是一张可以直接使用的空白画布。v4 的目标不是继续堆演示功能，而是把少量核心流程做完整。

| 范围     | 当前行为                                                                           |
| -------- | ---------------------------------------------------------------------------------- |
| 绘制     | 多种画笔预设、笔压笔迹、矩形、圆形、直线、箭头、文字和图片                         |
| 编辑     | 选择、移动、缩放、旋转、组合、锁定、复制粘贴、撤销重做，以及行为可预测的局部擦除   |
| 工作区   | 多文档、标题与正文搜索、排序、图层、背景、网格、吸附、缩放和小地图                 |
| 模板     | 5 个内置可编辑模板，也可以把当前内容保存为自定义模板                               |
| 持久化   | 文档自动保存到 IndexedDB；偏好与自定义模板保存在本地                               |
| 迁移     | 按完整内容导出 PNG、JPEG、PDF、SVG；严格 v4 JSON 备份；兼容导入 v4、v3 和旧版 JSON |
| 运行方式 | 响应式 Web 应用、可离线安装的 PWA，以及启用沙箱的 Electron 桌面壳                  |

## “本地优先”的实际含义

- 文档保存在当前浏览器来源的 IndexedDB 数据库 `mindnotes-pro-v4` 中。
- 项目不提供账号、托管同步或多人实时协作。
- 清除浏览器站点数据可能删除本地文档。重要内容应定期导出 JSON 备份。
- 导入 JSON 时会创建一个独立的可编辑文档，不会覆盖当前文档。
- v4 首次启动且数据库为空时，会尽量迁移旧的 `mindnotes-drawing-data` 本地文档。

## 快速开始

环境要求：Node.js `>=22.22.2` 和 npm。

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci
npm run dev
```

Vite 默认运行在 [http://localhost:3000](http://localhost:3000)。

## 常用命令

| 命令                    | 用途                                          |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | 启动浏览器开发服务器                          |
| `npm run build`         | 类型检查并构建 Web 应用                       |
| `npm run preview`       | 预览生产构建                                  |
| `npm run test:run`      | 执行一次 Vitest 测试套件                      |
| `npm run test:coverage` | 执行单元与集成测试并检查覆盖率阈值            |
| `npm run test:e2e`      | 构建应用并运行 Chromium 关键用户流程          |
| `npm run lint`          | 对应用源码执行 ESLint                         |
| `npm run check`         | 执行 lint、测试、Web 构建和 Electron 类型检查 |
| `npm run dev:desktop`   | 同时启动 Vite 与 Electron 桌面壳              |
| `npm run build:desktop` | 构建 Web 应用并打包当前桌面平台               |

第一次在本地运行 E2E 前需要安装 Playwright 浏览器：

```bash
npx playwright install chromium
```

## 导出与恢复

图片与文档导出使用完整可见内容的边界，不受当前平移和缩放影响。PNG 保留透明背景；JPEG 与 PDF 使用文档背景；SVG 尽量保留矢量内容。

v4 JSON 备份协议是明确且可验证的：

```json
{
  "format": "mindnotes-pro-backup",
  "version": 4,
  "exportedAt": "2026-07-31T00:00:00.000Z",
  "document": {
    "title": "项目画布",
    "elements": [],
    "layers": [],
    "activeLayerId": "layer-default",
    "bgColor": "#ffffff",
    "backgroundStyle": "plain"
  }
}
```

格式损坏或版本不支持时，应用会明确报错；导入失败不会静默丢弃当前文档。

## 代码结构

```text
src/
├── canvas/        渲染、几何、画笔与导出辅助函数
├── components/    React 界面与浏览器交互编排
├── eraser/        简单几何橡皮擦与空间索引
├── keyboard/      快捷键定义与匹配
├── store/         Zustand 切片、IndexedDB、数据协议与备份
└── templates/     内置与自定义可编辑模板

electron/
└── main.mts       最小化、启用沙箱的桌面壳

e2e/               Playwright 关键用户流程
```

模块归属规则与当前重构重点见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 产品边界

当前明确不做托管云存储、账号体系、画布内容遥测和多人实时编辑。这些能力会改变项目的隐私与维护模型，不属于当前目标。

接下来的工程重点是可靠性：缩小指针与渲染模块、继续改善无障碍体验、用数据验证大文档性能，并完善发布自动化。详见 [ROADMAP.md](ROADMAP.md)。

## 参与贡献

欢迎范围清楚的 bug 修复、回归测试、无障碍改进和准确的文档修改。提交 PR 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

安全问题请按 [SECURITY.md](SECURITY.md) 私下报告；版本变化记录在 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT](LICENSE)
