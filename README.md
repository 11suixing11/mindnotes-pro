# MindNotes Pro 🧠✨

> 基于浏览器的实时手写笔记工具，支持多种输入方式和 AI 增强功能

---

## 🎯 项目定位

一个**现代化、隐私优先**的手写笔记应用，在浏览器中提供流畅的书写体验和智能 AI 辅助。

### 核心特性

- ✏️ **多种输入方式** - 鼠标、键盘、触控板、触屏
- 🎨 **实时渲染** - 流畅的笔迹渲染，支持压感
- 💾 **多格式导出** - PNG、PDF、JSON、Markdown
- 🤖 **AI 增强** - 手写识别、笔记总结、内容优化
- 🔒 **隐私优先** - 数据本地存储，可选云端同步

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

浏览器会自动打开 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

---

## 📋 功能模块

### 1. 实时输入与渲染

| 输入方式 | 说明 |
|---------|------|
| 🖱️ 鼠标 | 按住左键绘写，实时渲染 |
| ⌨️ 键盘 | 文字编辑模式（开发中） |
| 🖐️ 触控板/触屏 | 支持压感、手势操作 |

**画布功能**：
- 撤销/重做
- 橡皮擦
- 颜色选择
- 笔迹粗细
- 缩放平移

### 2. 保存与导出

**支持的格式**：

| 格式 | 用途 | 状态 |
|------|------|------|
| PNG | 图片分享 | ✅ |
| PDF | 文档打印 | ✅ |
| JSON | 原始笔迹数据（可再编辑） | ✅ |
| Markdown | 结构化文本 | 🚧 |
| SVG | 矢量图 | 🚧 |

### 3. AI 增强功能（开发中）

```
POST /api/ai/recognize    → 手写识别（笔迹→文字）
POST /api/ai/summarize    → 笔记摘要/总结
POST /api/ai/enhance      → 内容优化/补全
POST /api/ai/translate    → 翻译
POST /api/ai/format       → 智能排版
```

---

## 🏗️ 技术架构

### 前端技术栈

```
React 18          - UI 框架
TypeScript        - 类型系统
Vite              - 构建工具
Tailwind CSS      - 样式框架
Zustand           - 状态管理
perfect-freehand  - 平滑笔迹算法
jsPDF             - PDF 生成
FileSaver.js      - 文件下载
```

### 核心组件

```
src/
├── components/
│   ├── Canvas.tsx       # 画布组件（核心）
│   ├── Toolbar.tsx      # 工具栏
│   └── SaveDialog.tsx   # 保存对话框
├── store/
│   └── useAppStore.ts   # 状态管理
├── utils/
│   ├── export.ts        # 导出工具
│   └── storage.ts       # 本地存储
└── App.tsx              # 主应用
```

---

## 📁 项目结构

```
mindnotes-pro/
├── src/                    # 源代码
│   ├── components/         # React 组件
│   ├── store/              # 状态管理
│   ├── utils/              # 工具函数
│   ├── App.tsx             # 主应用
│   └── main.tsx            # 入口文件
├── public/                 # 静态资源
├── index.html              # HTML 模板
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
├── tailwind.config.js      # Tailwind 配置
├── vite.config.ts          # Vite 配置
└── README.md               # 项目说明
```

---

## 🎯 开发路线图

### P0 - 核心功能（已完成）

- ✅ 项目框架搭建
- ✅ 画布组件（鼠标输入）
- ✅ 工具栏（笔/橡皮/颜色/粗细）
- ✅ 实时渲染笔迹
- ✅ 基础导出（PNG/JSON/PDF）

### P1 - 增强功能（进行中）

- 🚧 键盘输入支持
- 🚧 触控板/触屏优化
- 🚧 撤销/重做功能
- 🚧 自动保存草稿
- 🚧 更多导出格式（SVG/MD）

### P2 - AI 集成（计划中）

- ⏳ 接入 OpenAI API
- ⏳ 手写识别功能
- ⏳ 笔记总结功能
- ⏳ 内容优化功能
- ⏳ 翻译功能

### P3 - 高级功能（未来）

- ⏳ 本地草稿自动保存
- ⏳ 主题/样式自定义
- ⏳ 笔记分类/标签
- ⏳ 搜索功能
- ⏳ 云端同步（可选）

---

## 🤝 贡献指南

欢迎贡献代码、提出建议！

### 开发流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 提交信息规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建/工具相关
```

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) - 平滑笔迹算法
- [jsPDF](https://github.com/parallax/jsPDF) - PDF 生成
- [Zustand](https://github.com/pmndrs/zustand) - 轻量状态管理

---

## 📞 联系方式

- **GitHub**: https://github.com/11suixing11/mindnotes-pro
- **Issues**: https://github.com/11suixing11/mindnotes-pro/issues

---

**MindNotes Pro - 让笔记更智能！** 🧠✨
