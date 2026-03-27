# 🧠 MindNotes Pro

<div align="center">

**下一代智能笔记应用 - 手写与文字的完美结合**

[![Version](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro?color=blue&label=Version)](https://github.com/11suixing11/mindnotes-pro/releases)
[![License](https://img.shields.io/github/license/11suixing11/mindnotes-pro?color=green)](LICENSE)
[![Stars](https://img.shields.io/github/stars/11suixing11/mindnotes-pro?style=social)](https://github.com/11suixing11/mindnotes-pro/stargazers)
[![Forks](https://img.shields.io/github/forks/11suixing11/mindnotes-pro?style=social)](https://github.com/11suixing11/mindnotes-pro/network)
[![CI/CD](https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-97%20passing-brightgreen)](https://github.com/11suixing11/mindnotes-pro/actions)

[🚀 在线体验](https://11suixing11.github.io/mindnotes-pro/) · [📖 文档中心](docs/README.md) · [💬 社区](https://github.com/11suixing11/mindnotes-pro/discussions) · [🎁 下载](https://github.com/11suixing11/mindnotes-pro/releases)

</div>

---

## 🎯 产品定位

> **MindNotes Pro** 是一款为知识工作者、学生和创作者打造的智能笔记应用。
> 结合手写的自然感和文字的结构化，让你的思维更自由，让知识更有条理。

---

## ✨ 核心亮点

### 🎨 手写 + 文字，完美融合

- ✍️ **自然手写** - 流畅的笔触，支持压感，像在纸上书写
- ⌨️ **文字输入** - 富文本编辑，结构化整理
- 🔄 **无缝切换** - 手写与文字自由混合，发挥最大创造力
- 📐 **智能图形** - 自动识别几何图形，手绘变标准

### ⚡ 效率倍增

- 🎯 **命令面板** - `Ctrl+P` 快速访问所有功能
- ⌨️ **快捷键** - 完整的键盘操作体系
- 📑 **图层管理** - 组织复杂内容，清晰有序
- 🔍 **智能搜索** - 快速定位笔记内容

### 🔒 隐私优先

- 💾 **本地存储** - 数据完全存储在本地浏览器
- 🚫 **零数据收集** - 不收集任何个人信息
- 🔓 **开源透明** - 代码开源，安全可审计
- 🌐 **离线可用** - PWA 支持，无需网络也能使用

### 🌍 全平台支持

| 平台 | 状态 | 说明 |
|------|------|------|
| **Web** | ✅ 已发布 | 打开浏览器即用 |
| **Windows** | ✅ 已发布 | Electron 桌面应用 |
| **macOS** | ✅ 已发布 | Electron 桌面应用 |
| **Linux** | ✅ 已发布 | Electron 桌面应用 |
| **Android** | 🚧 开发中 | Capacitor 构建 |
| **iOS** | 📅 计划中 | 待开发 |

---

## 🚀 快速开始

### 在线使用（推荐）

访问 [https://11suixing11.github.io/mindnotes-pro/](https://11suixing11.github.io/mindnotes-pro/)

**无需安装，打开浏览器即可开始创作！**

### 桌面应用下载

| 系统 | 下载 | 大小 |
|------|------|------|
| Windows | [下载 .exe](https://github.com/11suixing11/mindnotes-pro/releases) | ~80MB |
| macOS | [下载 .dmg](https://github.com/11suixing11/mindnotes-pro/releases) | ~85MB |
| Linux | [下载 .AppImage](https://github.com/11suixing11/mindnotes-pro/releases) | ~80MB |

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:5173
```

---

## 📚 使用场景

### 👨‍🎓 学生党

- 📖 **课堂笔记** - 手写公式 + 文字说明，完美记录
- 📝 **作业整理** - 智能模板，结构化复习
- 🎯 **考试复习** - 快速搜索，高效回顾

### 💼 知识工作者

- 📊 **会议记录** - 快速捕捉灵感，会后整理
- 💡 **头脑风暴** - 无限画布，自由发散
- 📋 **项目管理** - 图层管理，清晰有序

### 🎨 创作者

- ✏️ **草图绘制** - 流畅笔触，创意无限
- 📝 **内容创作** - 手写 + 文字，最佳组合
- 🗂️ **灵感收集** - 随时记录，随时整理

---

## 🛠️ 技术栈

<div align="center">

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&style=flat-square)
![tldraw](https://img.shields.io/badge/tldraw-最新-ff6b6b?logo=github&style=flat-square)

</div>

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 框架**: Tailwind CSS
- **画布引擎**: tldraw
- **动画**: Framer Motion
- **状态管理**: Zustand
- **PWA**: Workbox
- **桌面应用**: Electron / Tauri
- **移动端**: Capacitor

---

## 📊 项目质量

### 测试覆盖

```
✅ 97 个测试全部通过
├── Store 测试：51 个
├── 组件测试：11 个
├── 核心功能：25 个
└── 其他测试：10 个
```

### 代码质量

```
✅ TypeScript 严格模式
✅ ESLint 代码规范
✅ Prettier 代码格式化
✅ CI/CD 自动化
```

### 性能指标

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 首屏加载 (FCP) | ~600ms | <700ms | ✅ 优秀 |
| Bundle 大小 | ~150KB | <200KB | ✅ 优秀 |
| 测试覆盖率 | ~75% | >80% | 🔄 进行中 |

---

## 🗺️ 路线图

### ✅ v1.3.2（当前版本）

- [x] 基础手写 + 文字功能
- [x] 命令面板和快捷键
- [x] 多格式导出
- [x] PWA 离线支持
- [x] 代码模块化重构

### 🚧 v1.4.0（开发中）

- [ ] 实时协作编辑
- [ ] 云端同步（可选）
- [ ] AI 智能辅助
- [ ] 更多智能模板

### 📅 v2.0.0（愿景）

- [ ] 知识图谱视图
- [ ] 跨设备同步
- [ ] 移动端应用
- [ ] 插件系统

---

## 🤝 参与贡献

MindNotes Pro 是开源项目，欢迎你的参与！

### 贡献方式

- 🐛 [报告 Bug](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- ✨ [建议功能](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 📖 改进文档
- 🎨 优化 UI/UX
- 🧪 编写测试
- 🌍 帮助翻译

### 开发流程

```bash
# 1. Fork 仓库
# 2. 创建功能分支
git checkout -b feature/amazing-feature

# 3. 开发并测试
npm run dev
npm test

# 4. 提交代码
git commit -m "feat: add amazing feature"

# 5. 推送到 Fork
git push origin feature/amazing-feature

# 6. 创建 Pull Request
```

### 开发环境

```bash
# 环境要求
- Node.js 18+
- npm 9+

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build
```

---

## 📰 更新日志

### v1.3.2 (2026-03-27)

**🎉 重大重构**
- 拆分 9 个大文件为模块化组件 (3459 行 → 1310 行，减少 62%)
- 新增 97 个自动化测试，覆盖率 75%+
- 修复所有组件和 Hooks 的 Store 导入

**✨ 新增功能**
- 错误边界组件，提升稳定性
- 新手引导，改善用户体验
- 自动化代码扫描工具

**🐛 Bug 修复**
- 修复 21 个组件的 Store 导入问题
- 修复所有失败的测试
- 优化 TypeScript 类型定义

[查看详细更新日志](CHANGELOG.md)

---

## 📄 许可证

**MIT License** - 详见 [LICENSE](LICENSE) 文件

简单来说：
- ✅ 可以自由使用、修改、分发
- ✅ 可用于商业用途
- ✅ 需要保留许可证声明
- ❌ 不提供任何担保

---

## 🙏 致谢

感谢以下优秀的开源项目：

- [tldraw](https://github.com/tldraw/tldraw) - 画布引擎
- [React](https://react.dev/) - UI 框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理

---

## 📬 联系方式

- 💬 [GitHub Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) - 社区讨论
- 🐛 [GitHub Issues](https://github.com/11suixing11/mindnotes-pro/issues) - Bug 报告
- 📧 Email - 1977717178@qq.com
- 🌐 官网 - https://11suixing11.github.io/mindnotes-pro/

---

## ⭐ 支持项目

如果你觉得 MindNotes Pro 有用：

1. 🌟 **给个 Star** - 这是最大的支持！
2. 📢 **分享给朋友** - 让更多人受益
3. 💻 **参与贡献** - 一起让项目更好
4. 📝 **反馈建议** - 帮助我们改进

---

<div align="center">

**Made with ❤️ by [11suixing11](https://github.com/11suixing11)**

[🚀 开始使用](#-快速开始) · [📖 查看文档](#-使用场景) · [🤝 参与贡献](#-参与贡献)

**🎯 让灵感瞬间结构化，让知识更有条理**

</div>
