# 🎯 MindNotes Pro

<div align="center">

**一款现代化手写笔记应用 - 免费、开源、全平台**

[![GitHub stars](https://img.shields.io/github/stars/11suixing11/mindnotes-pro?style=social)](https://github.com/11suixing11/mindnotes-pro/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/11suixing11/mindnotes-pro?style=social)](https://github.com/11suixing11/mindnotes-pro/network)
[![GitHub issues](https://img.shields.io/github/issues/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/issues)
[![GitHub license](https://img.shields.io/github/license/11suixing11/mindnotes-pro)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro)](https://github.com/11suixing11/mindnotes-pro/releases)
[![CI/CD](https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml)

[🚀 在线体验](https://11suixing11.github.io/mindnotes-pro/) · [📖 使用指南](docs/README.md) · [💬 社区讨论](https://github.com/11suixing11/mindnotes-pro/discussions) · [🐛 问题反馈](https://github.com/11suixing11/mindnotes-pro/issues)

</div>

---

## 🌟 为什么选择 MindNotes Pro？

在这个数字化的时代，你需要一个**自由、灵活、强大**的笔记工具。

| 特性 | MindNotes Pro | 传统笔记应用 |
|------|---------------|-------------|
| **输入方式** | ✍️ 手写 + ⌨️ 文字无缝切换 | 通常只支持一种 |
| **平台支持** | 🌐 Web/Windows/macOS/Linux/Android | 通常有限平台 |
| **费用** | 💰 完全免费，开源 | 💳 高级功能需订阅 |
| **数据存储** | 🔒 本地优先，隐私安全 | ☁️ 云端存储为主 |
| **离线使用** | ✅ PWA 支持，完全离线 | ❌ 通常需要网络 |
| **扩展性** | 🔌 开源可定制 | 🔒 封闭系统 |

---

## ✨ 核心功能

### 🎨 创作能力

- **手写笔记** - 流畅书写体验，支持压感
- **文字编辑** - 富文本编辑器，格式丰富
- **混合编辑** - 手写与文字自由切换
- **智能模板** - 6 个专业模板（康奈尔、子弹笔记等）
- **图形绘制** - 自动识别几何图形
- **无限画布** - 不受限制的创作空间

### ⚡ 效率工具

- **命令面板** - `Ctrl+P` 快速访问所有功能
- **快捷键系统** - 完整的键盘操作支持
- **图层管理** - 组织复杂笔记结构
- **多格式导出** - PNG/SVG/PDF/Markdown
- **版本历史** - 随时回溯到之前的版本

### 🔧 技术特性

- **PWA 支持** - 安装到桌面，离线可用
- **本地优先** - 数据存储在本地，快速响应
- **TypeScript** - 类型安全，开发友好
- **测试覆盖** - 61 个测试用例全部通过
- **性能优化** - 首屏加载 <1 秒

---

## 🚀 快速开始

### 在线体验（推荐新手）

直接访问：[https://11suixing11.github.io/mindnotes-pro/](https://11suixing11.github.io/mindnotes-pro/)

无需安装，打开浏览器即可使用！

### 本地开发

**环境要求**：Node.js 18+，npm 9+

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

### 常用命令

```bash
# 构建生产版本
npm run build

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# Bundle 分析
npm run bundle:analyze

# 平台环境检查
npm run health:multi
```

---

## 📦 平台支持

| 平台 | 状态 | 说明 |
|------|------|------|
| **Web** | ✅ 已发布 | GitHub Pages 在线访问 |
| **Windows** | ✅ 已发布 | Electron 打包 |
| **macOS** | ✅ 已发布 | Electron 打包 |
| **Linux** | ✅ 已发布 | Electron 打包 |
| **Android** | 🚧 开发中 | Capacitor 构建 |
| **iOS** | 📅 计划中 | 待开发 |

---

## 📊 最新版本

**当前版本**: v1.3.2

### 更新亮点

- ✅ 性能优化 - 首屏加载时间减少 30%
- ✅ 冲突解决 UI - 更好的协作体验
- ✅ 快捷键优化 - 统一交互路径
- ✅ 文档完善 - 新增使用指南

📝 详细更新内容请查看：
- [CHANGELOG.md](CHANGELOG.md) - 完整更新日志
- [RELEASE_NOTES_v1.3.2.md](RELEASE_NOTES_v1.3.2.md) - 发布说明

---

## 🗺️ 路线图

### v1.3.x（当前）
- [x] 基础手写 + 文字功能
- [x] 命令面板和快捷键
- [x] 多格式导出
- [x] PWA 离线支持
- [ ] 继续优化包体积和加载速度

### v1.4.x（开发中）
- [ ] 协作能力增强
- [ ] 冲突解决体验完善
- [ ] 云端同步（可选）
- [ ] 更多智能模板

### v2.0.0（愿景）
- [ ] AI 辅助功能
- [ ] 实时协作编辑
- [ ] 知识图谱视图
- [ ] 跨设备同步

---

## 🙋 常见问题

### Q: 需要安装吗？
**A**: 不需要！可以直接在线使用。如果需要离线使用或桌面应用，可以下载 Electron 版本。

### Q: 数据安全吗？
**A:** 非常安全。数据默认存储在本地浏览器中，不会上传到任何服务器。你也可以导出备份。

### Q: 支持导入其他笔记应用的数据吗？
**A:** 目前支持导入 Markdown 文件。其他格式的导入功能正在开发中。

### Q: 可以在手机上使用吗？
**A:** Web 版本可以在手机浏览器中使用。Android 原生应用正在开发中。

### Q: 如何贡献代码？
**A:** 欢迎贡献！请查看 [贡献指南](#-贡献)，从简单的文档改进或 Bug 修复开始。

### Q: 遇到问题怎么办？
**A:** 可以通过以下方式获取帮助：
- 📖 查看 [使用指南](docs/README.md)
- 💬 在 [GitHub Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) 提问
- 🐛 提交 [Issue](https://github.com/11suixing11/mindnotes-pro/issues)

---

## 🤝 贡献

MindNotes Pro 是开源项目，欢迎你的参与！

### 贡献方式

- 🐛 [报告 Bug](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- ✨ [建议新功能](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
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

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

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

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

简单来说：你可以自由地使用、修改、分发这个软件，甚至用于商业目的。

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
- 🐛 [GitHub Issues](https://github.com/11suixing11/mindnotes-pro/issues) - Bug 报告和功能建议
- 📧 Email - 1977717178@qq.com

---

## ⭐ 支持项目

如果你觉得 MindNotes Pro 有用：

- 🌟 给项目一个 **Star** - 这是最大的支持！
- 📢 **分享给朋友** - 让更多人受益
- 💻 **参与贡献** - 一起让项目更好
- 📝 **反馈建议** - 帮助我们改进

---

<div align="center">

**Made with ❤️ by [11suixing11](https://github.com/11suixing11)**

[🚀 开始使用](#-快速开始) · [📖 查看文档](#-使用指南) · [🤝 参与贡献](#-贡献)

</div>
