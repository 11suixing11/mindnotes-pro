<div align="center">

# MindNotes Pro 🧠✨

> **下一代智能手写笔记应用**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-purple?logo=vite)](https://vitejs.dev/)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [技术架构](#-技术架构) • [开发计划](#-开发计划) • [贡献](#-贡献)

</div>

---

## 📖 简介

**MindNotes Pro** 是一款基于浏览器的现代化手写笔记应用，提供流畅的书写体验和智能的 AI 辅助功能。

### 🎯 核心理念

- ✨ **简洁高效** - 专注核心功能，无干扰的书写体验
- 🔒 **隐私优先** - 数据完全本地存储，不上传云端
- 🤖 **智能增强** - AI 辅助识别、总结、优化笔记内容
- 🎨 **流畅体验** - 基于 perfect-freehand 的自然笔迹渲染

### 📸 预览

<div align="center">
  <img src="https://via.placeholder.com/800x450/4f46e5/ffffff?text=MindNotes+Pro+Preview" alt="应用预览" width="800" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"/>
</div>

---

## ✨ 功能特性

### 🎨 核心功能

| 功能 | 说明 | 状态 |
|------|------|------|
| **多种输入** | 鼠标、触控板、触屏手写 | ✅ |
| **实时渲染** | 流畅的笔迹渲染，支持压感 | ✅ |
| **工具切换** | 笔/橡皮擦快速切换 | ✅ |
| **颜色选择** | 6 种预设颜色 | ✅ |
| **粗细调整** | 5 档笔迹粗细 | ✅ |
| **撤销/重做** | 操作历史管理 | ✅ |
| **多格式导出** | PNG/PDF/JSON | ✅ |

### 🚀 高级功能

| 功能 | 说明 | 状态 |
|------|------|------|
| **键盘快捷键** | Ctrl+Z 撤销，Ctrl+S 保存 | ✅ |
| **自动保存** | 防止意外丢失 | 🚧 |
| **手写识别** | 笔迹转文字 | ⏳ |
| **AI 总结** | 自动提炼要点 | ⏳ |
| **内容优化** | 智能润色 | ⏳ |
| **翻译功能** | 多语言翻译 | ⏳ |
| **云端同步** | 可选云端备份 | ⏳ |

---

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- npm 9+
- 现代浏览器（Chrome 90+、Edge 90+、Firefox 88+）

### 安装

```bash
# 克隆项目
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器会自动打开 http://localhost:3000

### 构建

```bash
# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### 部署

推荐使用 [Vercel](https://vercel.com) 或 [Netlify](https://netlify.com) 部署：

```bash
# 构建
npm run build

# 输出目录：dist/
# 上传到任意静态托管平台
```

<details>
<summary><b>📦 Vercel 一键部署</b></summary>

1. 访问 [Vercel](https://vercel.com/new)
2. 导入 GitHub 仓库
3. 自动构建部署
4. 获得免费 HTTPS 域名

</details>

---

## 📖 使用指南

### 基础操作

| 操作 | 方法 |
|------|------|
| **开始绘写** | 鼠标按住左键拖动 |
| **切换工具** | 点击工具栏按钮 |
| **选择颜色** | 点击颜色圆点 |
| **调整粗细** | 点击粗细按钮 |
| **撤销** | `Ctrl+Z` 或点击撤销按钮 |
| **清空** | `Delete` 或点击清空按钮 |
| **保存** | `Ctrl+S` 或点击保存按钮 |

### 导出格式

| 格式 | 用途 | 特点 |
|------|------|------|
| **PNG** | 图片分享 | 兼容性好，文件小 |
| **PDF** | 文档打印 | 适合正式文档 |
| **JSON** | 数据备份 | 可再次编辑 |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+S` | 保存 |
| `Delete` | 清空画布 |
| `Esc` | 关闭对话框 |

---

## 🏗️ 技术架构

### 技术栈

```
┌─────────────────────────────────────────┐
│           前端技术栈                      │
├─────────────────────────────────────────┤
│ React 18        - UI 框架                │
│ TypeScript      - 类型系统               │
│ Vite 5          - 构建工具               │
│ Tailwind CSS    - 样式框架              │
│ Zustand         - 状态管理               │
├─────────────────────────────────────────┤
│           核心库                         │
├─────────────────────────────────────────┤
│ perfect-freehand - 平滑笔迹算法          │
│ jsPDF           - PDF 生成               │
│ FileSaver.js    - 文件下载              │
└─────────────────────────────────────────┘
```

### 项目结构

```
mindnotes-pro/
├── 📂 src/
│   ├── 📂 components/
│   │   ├── Canvas.tsx       # 画布组件 ⭐
│   │   ├── Toolbar.tsx      # 工具栏
│   │   └── SaveDialog.tsx   # 保存对话框
│   ├── 📂 store/
│   │   └── useAppStore.ts   # 状态管理
│   ├── App.tsx              # 主应用
│   ├── main.tsx             # 入口文件
│   └── index.css            # 全局样式
├── 📂 public/               # 静态资源
├── 📄 index.html            # HTML 模板
├── 🔧 配置文件
└── 📚 文档
```

### 核心算法

**笔迹平滑** (perfect-freehand):

```typescript
const pathData = getStroke(points, {
  size: 4,           // 笔迹大小
  thinning: 0.5,     // 压感敏感度
  smoothing: 0.5,    // 平滑度
  streamline: 0.5,   // 防抖动
})
```

---

## 📋 开发计划

### 当前版本：v1.0.0

#### ✅ 已完成 (P0)

- [x] 项目框架搭建
- [x] 画布组件（鼠标输入）
- [x] 工具栏（笔/橡皮/颜色/粗细）
- [x] 实时渲染笔迹
- [x] 基础导出（PNG/JSON/PDF）
- [x] 键盘快捷键支持

#### 🚧 进行中 (P1)

- [ ] 触屏优化
- [ ] 自动保存草稿
- [ ] 完整的撤销/重做
- [ ] 更多导出格式（SVG/Markdown）

#### ⏳ 计划中 (P2)

- [ ] AI 手写识别
- [ ] AI 笔记总结
- [ ] AI 内容优化
- [ ] AI 翻译功能

#### 📅 未来规划 (P3)

- [ ] 云端同步（可选）
- [ ] 笔记分类/标签
- [ ] 搜索功能
- [ ] 主题自定义
- [ ] 多语言支持

---

## 🤝 贡献

欢迎贡献代码、提出建议！

### 开发流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 提交信息规范

```
feat:     新功能
fix:      修复 bug
docs:     文档更新
style:    代码格式调整
refactor: 重构代码
test:     添加测试
chore:    构建/工具相关
```

### 需要帮助的地方

- 🐛 Bug 修复
- 📚 文档完善
- 🌍 多语言翻译
- 💡 新功能建议
- 🎨 UI/UX 优化

---

## 📄 许可证

MIT License

详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

感谢以下优秀的开源项目：

- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) - 平滑笔迹算法
- [jsPDF](https://github.com/parallax/jsPDF) - PDF 生成库
- [Zustand](https://github.com/pmndrs/zustand) - 轻量状态管理
- [Vite](https://github.com/vitejs/vite) - 下一代构建工具
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) - 实用优先的 CSS 框架

---

## 📞 联系方式

| 平台 | 链接 |
|------|------|
| **GitHub** | https://github.com/11suixing11/mindnotes-pro |
| **Issues** | https://github.com/11suixing11/mindnotes-pro/issues |
| **Discussions** | https://github.com/11suixing11/mindnotes-pro/discussions |

---

<div align="center">

**MindNotes Pro - 让笔记更智能！** 🧠✨

[返回顶部](#mindnotes-pro-)

</div>
