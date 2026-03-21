# 🧠 MindNotes Pro

**无限画布 · 自由书写 · 你的想法，不设边界**

[![Version](https://img.shields.io/badge/version-v1.2.2-blue?style=flat-square)](https://github.com/11suixing11/mindnotes-pro/releases/tag/v1.2.2)
[![Deploy](https://img.shields.io/github/actions/workflow/status/11suixing11/mindnotes-pro/deploy.yml?branch=main&label=Deploy&style=flat-square)](https://github.com/11suixing11/mindnotes-pro/actions)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/11suixing11/mindnotes-pro?style=social)](https://github.com/11suixing11/mindnotes-pro/stargazers)

### 🌐 [立即使用 →](https://11suixing11.github.io/mindnotes-pro) · [Release Notes →](https://github.com/11suixing11/mindnotes-pro/releases/tag/v1.2.2)

---

## 🆕 Latest: v1.2.2

核心升级：

- ✍️ **文字工具** — T 键切换，点击画布输入
- 👆 **选中移动** — V 键选择，拖动移动任意元素
- 🎨 **形状填充** — 半透明填充色
- 📋 **剪贴板复制** — 一键复制画布到剪贴板
- 📝 **Markdown 导出** — 文字内容导出为文档

[v1.2.0 完整功能 →](https://github.com/11suixing11/mindnotes-pro/releases/tag/v1.2.0)

[完整更新日志 →](CHANGELOG.md)

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| ✍️ **手写绘制** | 流畅笔迹，支持压感笔/鼠标/触摸屏 |
| 🔤 **文字工具** | 点击画布输入文字，T 键切换 |
| 👆 **选中移动** | V 键选择，拖动移动任意元素 |
| ⬜ **形状工具** | 矩形、圆形、三角形、直线、箭头，支持填充 |
| ↩️ **撤销/重做** | 50 步历史，`Ctrl+Z` / `Ctrl+Shift+Z` |
| 🎨 **颜色 & 粗细** | 6 种预设颜色 + 自定义，5 档粗细 |
| 🪟 **毛玻璃 UI** | 工具栏 & 面板模糊玻璃效果，多层阴影 |
| 🎭 **画布背景** | 多层渐变光晕 + 圆点网格，有机流动感 |
| 💾 **自动保存** | 2 秒防抖，刷新不丢数据 |
| 🔍 **缩放 & 平移** | 无限画布，`+`/`-`/`0` 快捷操作 |
| 📑 **图层管理** | 显示/隐藏/锁定/排序/删除 |
| 🌙 **深色模式** | 一键切换，自动跟随系统 |
| 📤 **导出** | PNG / SVG / PDF / JSON / Markdown / 剪贴板 |
| ⌨️ **快捷键** | `?` 查看全部，键盘流高效操作 |
| 📱 **PWA** | 安装到主屏幕，离线可用 |
| 🎯 **智能模板** | 7 种预设布局：横线纸/方格纸/会议纪要/待办看板/日记/思维导图 |

---

## ⚡ 性能

| 指标 | 数据 |
|------|------|
| 初始加载 | **~71 KB** gzip |
| 首次可交互 | **< 1s** (4G) |
| 重绘帧率 | **60 FPS** |
| 离线支持 | ✅ Service Worker |

体积按需加载：保存、模板、快捷键面板等组件在使用时才下载。

---

## 🛠️ 技术栈

```
React 18 + TypeScript + Vite + Zustand + TailwindCSS
         perfect-freehand · framer-motion · jsPDF
```

---

## 🚀 本地开发

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev        # → http://localhost:3000
npm run build      # → dist/
```

### 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 (热更新) |
| `npm run build` | TypeScript 编译 + 生产构建 |
| `npm run preview` | 预览构建产物 |

---

## 📁 项目结构

```
src/
├── components/          # UI 组件
│   ├── Canvas.tsx       # 核心画布 (Canvas 2D)
│   ├── Toolbar.tsx      # 工具栏
│   ├── LayersPanel.tsx  # 图层面板
│   ├── SaveDialog.tsx   # 导出对话框
│   └── ui/              # 基础 UI (Toast, Loading, ErrorBoundary)
├── hooks/               # 自定义 Hooks
│   ├── useAutoSave.ts   # 自动保存
│   ├── useMindNotesHotkeys.ts  # 快捷键
│   └── useShortcuts.ts  # 快捷键配置数据
├── store/               # Zustand 状态
│   ├── useAppStore.ts   # 画布状态 + 撤销重做
│   └── useThemeStore.ts # 主题偏好
└── utils/               # 工具函数
    └── snap.ts          # 智能吸附
```

---

## 📄 许可证

**MIT** — 自由使用、修改、分发。

详见 [LICENSE](LICENSE)

---

## 🤝 贡献

欢迎 PR！

1. Fork → 创建分支 → 提交 → Push → Pull Request
2. 代码规范参考 [docs/CODING_GUIDE.md](docs/CODING_GUIDE.md)

---

Made with ❤️ by [11suixing11](https://github.com/11suixing11)
