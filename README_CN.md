<div align="center">
  <img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

**一个本地优先、打开就能画的白板工具。**

适合快速记录想法、画草图、做图解、整理课堂或会议笔记。不需要账号，不依赖云端，不追踪你的内容。

  <p>
    <a href="https://11suixing11.github.io/mindnotes-pro">
      <img src="https://img.shields.io/badge/打开_MindNotes_Pro-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="打开 MindNotes Pro" />
    </a>
    <a href="#快速开始">
      <img src="https://img.shields.io/badge/快速开始-2ECC71?style=for-the-badge" alt="快速开始" />
    </a>
  </p>

  <p>
    <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml">
      <img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
    <img src="https://img.shields.io/badge/version-3.2.0-00C9A7?style=flat-square" alt="Version 3.2.0" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6" />
    <img src="https://img.shields.io/badge/runtime_dependencies-5-green" alt="5 runtime dependencies" />
  </p>

  <p>
    <strong>语言：</strong>
    <a href="README.md">English</a> ·
    中文
  </p>
</div>

---

## 这是什么？

MindNotes Pro 是一个运行在浏览器里的个人白板。它适合做手写笔记、快速草图、流程图、架构图、课堂/会议记录和视觉化思考。项目的核心方向是本地优先：文档保存在浏览器里，安装成 PWA 后可以离线使用，基础绘制体验不需要服务器。

它不是 Miro、Excalidraw、tldraw 或完整协作设计套件的替代品。MindNotes Pro 更偏向一个小而清晰的白板：启动快、工具够用、数据留在本地、源码边界容易理解，方便个人使用和开源维护。

## 功能概览

| 模块 | 能力 |
| --- | --- |
| 绘制 | 自由笔触、多种笔刷、形状、箭头、文字、图片粘贴 |
| 编辑 | 选择、多选、移动、缩放、旋转、复制、锁定、组合、取消组合、对齐、分布 |
| 图层 | 新建、重命名、排序、隐藏、锁定、删除图层，把选中元素移动到指定图层 |
| 模板 | 内置流程图、思维导图、线框图、网络图、康奈尔笔记模板，也支持把选中元素保存为自定义模板 |
| 文档 | 多文档、本地文件夹、预览、搜索、排序、重命名、复制、自动保存 |
| 导出 | PNG、JPEG、PDF、SVG、Word、JSON 备份和导出；支持 JSON 导入 |
| 效率 | 可配置快捷键、快捷色板、样式吸取、网格和吸附 |
| 本地优先 | 浏览器运行、PWA 安装、本地存储，也提供可选 Electron 桌面壳 |

## 核心功能

### 白板工具

- 基于 `perfect-freehand` 的自由笔触
- 矩形、圆形、直线、箭头等形状工具
- 可编辑文字元素和基础文字格式控制
- 剪贴板图片粘贴
- 画布平移、缩放、鹰眼/minimap、网格和吸附
- 浅色和深色主题

### 图层编辑

MindNotes Pro 在侧栏提供了一个紧凑的图层面板，用来管理复杂画布。

- 新元素会进入当前可写图层
- 隐藏图层不会参与渲染、命中测试、选择、预览和导出
- 锁定图层会阻止移动、删除、缩放、旋转、组合等破坏性编辑
- 删除图层时，元素会移动到兜底图层，不会被静默删除
- 旧文档打开时会自动归一到默认图层

### 模板系统

内置模板适合快速搭结构：

- Flowchart
- Mind Map
- Wireframe
- Network Diagram
- Cornell Notes

也可以把当前选中的画布元素保存成自定义模板。自定义模板保存在本地，并有数量上限，避免把应用变重。

### 导出和备份

当前支持：

- `PNG` 透明背景导出
- `JPEG` 白底导出，支持质量调节和预计大小
- `PDF` 按画布尺寸生成页面
- `SVG` 基于画布元素模型导出
- `Word` 文档，内嵌画布截图
- `JSON` 完整备份，包含元素和图层元数据

JSON 导入支持当前 MindNotes Pro 数据，也兼容部分旧 stroke/shape 数据结构。

## 隐私和数据

MindNotes Pro 把画布文档存放在浏览器存储中。应用不要求注册，也不会把你的画布内容上传到应用服务器。

这个选择也有代价：

- 清理站点数据可能删除本地文档
- 换浏览器或换设备不会自动同步内容
- 重要内容建议导出成 JSON、PNG、SVG 或 PDF
- 超大画布未来需要比 `localStorage` 更稳的存储层，例如 IndexedDB

如果你需要实时多人协作、团队空间、云端历史或账号同步，现在更适合选择成熟的协作白板产品。

## 快速开始

### 在线使用

打开在线版本：

https://11suixing11.github.io/mindnotes-pro

### 本地开发

前置要求：

- Node.js 版本符合 `package.json` 里的 `engines.node`
- npm

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm ci
npm run dev
```

Vite 默认会自动打开浏览器。如果没有自动打开，可以访问：

```text
http://localhost:3000
```

### 生产构建

```bash
npm run build
npm run preview
```

### 运行桌面壳

```bash
npm run dev:desktop
```

使用 Electron Builder 打包桌面应用：

```bash
npm run build:desktop
```

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器，默认端口 3000 |
| `npm run build` | TypeScript 检查和生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run test` | Vitest watch 模式 |
| `npm run test:run` | 单次运行完整 Vitest 测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率 |
| `npm run lint` | 对 `src/**/*.{ts,tsx}` 运行 ESLint |
| `npm run dev:desktop` | 同时启动 Vite 和 Electron |
| `npm run build:desktop` | 构建 Web 应用并打包 Electron |

## 快捷键

在应用中按 `?` 或 `F1` 可以查看完整快捷键列表。大多数快捷键可以在设置面板中自定义。

| 快捷键 | 功能 |
| --- | --- |
| `0` | 选择工具 |
| `1` | 画笔工具 |
| `2` | 橡皮擦 |
| `3` | 平移工具 |
| `4` / `5` / `6` / `7` / `8` | 矩形 / 圆形 / 文字 / 直线 / 箭头 |
| `Ctrl` + `Z` | 撤销 |
| `Ctrl` + `Shift` + `Z` 或 `Ctrl` + `Y` | 重做 |
| `Ctrl` + `C` / `Ctrl` + `V` | 复制 / 粘贴 |
| `Ctrl` + `Shift` + `V` | 粘贴为纯文本 |
| `Ctrl` + `D` | 复制选中元素 |
| `Ctrl` + `G` / `Ctrl` + `Shift` + `G` | 组合 / 取消组合 |
| `Ctrl` + `L` / `Ctrl` + `Shift` + `L` | 锁定 / 解锁选中元素 |
| `+` / `-` | 放大 / 缩小 |
| `Ctrl` + `0` | 重置视图 |
| `Ctrl` + `2` | 缩放到选区 |
| `Shift` + `G` | 显示/隐藏网格 |
| `Shift` + `S` | 开关网格吸附 |
| `Q` | 样式吸取 |
| `Esc` | 取消当前模式 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| UI | React 19、TypeScript 6 |
| 状态管理 | Zustand slices |
| 绘制 | Canvas API、`perfect-freehand` |
| 空间查询 | 自研 R-tree 风格空间索引，用于橡皮擦和视口查询 |
| 导出 | Canvas 导出 API、SVG serializer、懒加载 `jsPDF` |
| 样式 | Tailwind CSS、项目 CSS variables |
| PWA | Web manifest、service worker |
| 桌面端 | Electron、Electron Builder |
| 测试 | Vitest、Testing Library、jsdom、Playwright 配置 |
| 构建 | Vite 8 |

当前运行时依赖保持在 5 个：

- `react`
- `react-dom`
- `zustand`
- `perfect-freehand`
- `jspdf`

## 项目结构

```text
src/
├── canvas/        绘制领域逻辑、笔刷预设、SVG 导出、几何规则
├── components/    React UI、画布 hooks、工具栏、侧栏、图层、模板、导出 UI
├── eraser/        物理橡皮擦、粒子、音频、偏好设置、空间索引
├── keyboard/      快捷键定义和冲突处理
├── store/         Zustand slices、持久化、迁移、应用类型、图层辅助函数
├── templates/     内置模板和自定义模板模型
├── App.tsx        应用组合入口
└── main.tsx       Web 入口

electron/
└── main.ts        可选桌面壳入口
```

更详细的边界说明见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 质量保障

仓库为 PR 和 main 分支配置了自动检查：

- TypeScript check
- Vitest test suite
- ESLint
- Production build
- GitHub Pages deployment
- Lighthouse audit

本地提交 PR 前建议运行 `npm run test:run`、`npm run lint` 和 `npm run build`。

## 路线图

接下来更值得投入的是可靠性和体验打磨，而不是把项目扩成大型云端协作产品。

- 将大文档持久化迁移到 IndexedDB 或其他容量更好的存储层
- 改善手机、平板和手写笔设备体验
- 强化工具栏、弹窗、菜单和纯键盘工作流的可访问性
- 加固 JSON/SVG/PDF 导入导出的边界情况
- 持续减少 lint warnings，并拆分职责过重的大文件
- 完善 Electron 打包和发布自动化

当前方向下的非目标：

- 强制账号
- 服务端文档存储
- 实时多人协作
- 分析或读取用户画布内容的埋点

## 贡献

欢迎 issue 和 PR。最有帮助的贡献通常是具体、可复现、边界清楚的：

- Bug 报告请包含复现步骤、期望行为、实际行为、浏览器/系统信息，必要时附截图
- Feature request 请描述真实工作流，而不是只描述一个按钮
- PR 尽量小而聚焦，并为行为变化补测试
- 文档 PR 请直接修正不准确的行为、设置或架构描述

相关链接：

- [贡献指南](CONTRIBUTING.md)
- [架构说明](ARCHITECTURE.md)
- [路线图](ROADMAP.md)
- [安全政策](SECURITY.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [产品反馈讨论](https://github.com/11suixing11/mindnotes-pro/discussions/97)

## 许可证

MindNotes Pro 使用 [MIT License](LICENSE) 发布。
