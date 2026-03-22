# 🎯 MindNotes Pro

<div align="center">

**一款现代化手写笔记应用 - 免费、开源、全平台**

[![GitHub stars](https://img.shields.io/github/stars/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/network)
[![GitHub issues](https://img.shields.io/github/issues/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/issues)
[![GitHub license](https://img.shields.io/github/license/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/releases)

[� 立即体验](https://11suixing11.github.io/mindnotes-pro/) · [📖 使用指南](docs/README.md) · [💬 社区讨论](https://github.com/11suixing11/mindnotes-pro/discussions) · [🐛 问题反馈](https://github.com/11suixing11/mindnotes-pro/issues)

</div>

---

## ✨ 核心特性

<div align="center">

| 🎨 手写 + 文字 | ⚡ 轻量快速 | 🌐 全平台 | 🎯 智能高效 |
|:---:|:---:|:---:|:---:|
| 流畅书写<br/>压感支持 | 首屏<1秒<br/>Bundle <25KB | Web/Win/Mac/Linux/Android | 命令面板<br/>快捷键系统 |

</div>

---

## 🚀 快速开始

### 🌐 在线使用（推荐）

<div align="center">

**👉 [点击这里开始使用](https://11suixing11.github.io/mindnotes-pro/)**

</div>

### 💻 本地开发

**系统要求：** Node.js ≥ 18.0, npm ≥ 9.0

```bash
# 克隆项目
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro

# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 构建生产版本
npm run build

# GitHub Pages 构建（子路径）
npm run build:web

# 发布到 GitHub Pages
npm run deploy
```

### 📱 不同平台使用

| 平台 | 方式 | 说明 |
|------|------|------|
| **Web** | [在线链接](https://11suixing11.github.io/mindnotes-pro/) | 无需安装，即开即用 |
| **Windows** | [下载 .exe](https://github.com/11suixing11/mindnotes-pro/releases) | Electron 应用，完整功能 |
| **macOS** | [下载 .dmg](https://github.com/11suixing11/mindnotes-pro/releases) | Universal Binary (Intel/Apple Silicon) |
| **Linux** | [下载 .AppImage](https://github.com/11suixing11/mindnotes-pro/releases) | 或编译源码：`npm run electron:build` |
| **Android** | [下载 .apk](https://github.com/11suixing11/mindnotes-pro/releases) | Capacitor 混合应用 |

### 🔧 环境变量（可选）

在 `.env` 或部署平台中配置：

```env
# 自定义应用基路径（默认为 / 或 /mindnotes-pro/）
VITE_APP_BASE=/mindnotes-pro/

# 生产环境启用调试日志（默认关闭）
VITE_ENABLE_DEBUG_LOGS=false
```

---

## 📦 完整功能列表

### 核心笔记功能
- ✅ **手写笔记** - 毛笔、铅笔、荧光笔等多种笔刷，支持压力感应
- ✅ **文字输入** - 富文本编辑，支持多种字体和排版
- ✅ **智能模板** - 6 种专业模板（空白、网格、点阵、线条、计划、日记）
- ✅ **多格式导出** - PNG/SVG/PDF/Markdown 等格式

### 高效操作
- ✅ **命令面板** - Ctrl/Cmd + P 快速访问功能
- ✅ **完整快捷键** - 双指拖动、长按菜单等触控手势支持
- ✅ **图层管理** - 无限图层，可自由组织和管理
- ✅ **无限画布** - 平移、缩放、旋转，自由创作空间

### 智能特性
- ✅ **实时同步** - 自动保存到本地存储
- ✅ **PWA 离线模式** - 无网络也能使用，自动更新
- ✅ **深色模式** - 自动/手动切换，保护眼睛
- ✅ **响应式设计** - 桌面/平板/手机完美适配

### 高性能
- ✅ **首屏 <1s** - 优化至极致，加载飞快
- ✅ **Bundle <25KB** - 最小化依赖，轻量高效
- ✅ **流畅动画** - 60fps 帧率，丝般顺滑
- ✅ **完整测试** - 31+ 单元测试覆盖核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 🌐 PWA 支持 | ✅ | 离线可用，自动更新 |
| 📱 移动端优化 | ✅ | 响应式设计，触控友好 |
| 🌙 深色模式 | ✅ | 自动/手动切换 |
| ⌨️ 快捷键系统 | ✅ | Ctrl+P 命令面板，完整指南 |
| 🔄 云端同步 | 🔄 | v1.4.0 计划 - GitHub 集成

---

## 🛠️ 技术栈

<div align="center">

| 类别 | 技术 | 说明 |
|------|------|------|
| **UI 框架** | React 18 | 现代化前端框架 |
| **编程语言** | TypeScript | 类型安全的开发体验 |
| **构建工具** | Vite 5 | 极速开发和构建 |
| **样式** | Tailwind CSS 3 | 实用优先的 CSS 框架 |
| **画布引擎** | tldraw | 高性能绘图引擎 |
| **状态管理** | Zustand | 轻量级状态库 |
| **动画** | Framer Motion | 流畅动画库 |
| **PWA** | Workbox | 离线缓存方案 |
| **桌面** | Electron | 跨平台桌面应用 |
| **移动** | Capacitor | 跨平台移动应用 |
| **测试** | Vitest + React Testing Library | 单元和集成测试 |

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![tldraw](https://img.shields.io/badge/tldraw-Latest-ff6b6b?logo=github)

</div>

### 性能指标 📊

| 指标 | 数值 | 说明 |
|------|------|------|
| 首屏加载时间 | <1s | 高度优化的初始化 |
| JS Bundle | <25KB | 最小化依赖体积 |
| 单元测试覆盖 | 31+ | 核心功能完全覆盖 |
| Lighthouse 评分 | 90+ | 优秀的性能和体验 |

---

## � 项目进展

- **v1.0.0** - 2024 年 Q1：基础笔记功能
- **v1.1.0** - 2024 年 Q2：移动端适配
- **v1.2.0** - 2024 年 Q3：PWA 离线支持
- **v1.3.0** - 2024 年 Q4：性能优化和日志系统
- **v1.3.1** - 项目主页重构，增强用户体验
- **v1.4.0** - 计划中：云端同步，GitHub 集成

---

## ❓ 常见问题（FAQ）

### Q: 我的笔记数据存储在哪里？
A: 笔记数据存储在浏览器本地存储（localStorage）中，完全私密，不会上传到任何服务器。

### Q: 是否支持离线使用？
A: 完全支持！应用是 PWA，首次使用后可离线工作。更新会自动检测并在后台进行。

### Q: 支持哪些导出格式？
A: 支持 PNG、SVG、PDF、Markdown 等多种格式，满足不同使用场景。

### Q: 如何报告 Bug 或建议功能？
A: 欢迎在 [Issues](https://github.com/11suixing11/mindnotes-pro/issues) 中提出，或在 [Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) 中讨论。

### Q: 是否有快捷键帮助？
A: 在应用内按 `?` 或 Ctrl+Shift+/ 即可查看完整快捷键列表。

---

## 🤝 贡献指南

MindNotes Pro 是开源项目，欢迎各种形式的贡献！

### 贡献方式

- **🐛 报告 Bug** - 在 [Issues](https://github.com/11suixing11/mindnotes-pro/issues) 中提出详细描述
- **✨ 功能建议** - 在 [Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) 中讨论新想法
- **📖 文档改进** - 改进 README 或 docs 文件夹的内容
- **🎨 UI/UX 优化** - 提交设计改进或用户体验优化
- **🧪 编写测试** - 增加单元测试覆盖率
- **🌍 翻译本地化** - 贡献其他语言的翻译

### 开发流程

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 代码风格

- 使用 TypeScript 进行类型检查
- 遵守 ESLint 规则 (`npm run lint`)
- 为新功能编写单元测试 (`npm run test`)
- 提交前确保所有测试通过

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

本项目可自由用于商业和个人用途，无需许可。

---

## 🙏 致谢

感谢以下开源项目和贡献者：

<div align="center">

| 项目 | 说明 |
|------|------|
| [tldraw](https://github.com/tldraw/tldraw) | 高性能画布引擎 |
| [React](https://react.dev/) | 现代 UI 框架 |
| [Vite](https://vitejs.dev/) | 极速构建工具 |
| [Tailwind CSS](https://tailwindcss.com/) | 样式框架 |
| [Zustand](https://zustand-demo.vercel.app/) | 状态管理 |

</div>

---

<div align="center">

### 🌟 项目成长需要你的支持

如果这个项目对你有帮助，请给我们一个 Star ⭐

这会帮助更多人发现和使用 MindNotes Pro

</div>

---

<div align="center">

**Made with ❤️ by the MindNotes Pro Community**

📧 **联系方式**: 1977717178@qq.com

🔗 **社交媒体**: 
- [GitHub](https://github.com/11suixing11/mindnotes-pro)
- [Issues & Discussions](https://github.com/11suixing11/mindnotes-pro/discussions)

</div>
