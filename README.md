# MindNotes Pro

一个本地优先（Local-first）的白板应用：打开即可绘制，数据默认保存在本地设备，不依赖后端服务。

- 在线体验：https://11suixing11.github.io/mindnotes-pro
- 反馈讨论：https://github.com/11suixing11/mindnotes-pro/discussions/97
- 许可证：MIT

## 核心特性

- **自由绘制与笔刷**：基于 `perfect-freehand` 的平滑笔触体验
- **基础图形与文字**：矩形、圆形、直线、箭头、文本
- **选择与编辑**：框选、移动、缩放、复制粘贴、分组/解组、撤销重做
- **文档与文件夹管理**：支持多文档组织与自动保存
- **导出能力**：支持 PNG / PDF 导出（PDF 由 `jsPDF` 生成）
- **主题与引导**：深色模式、首次使用引导、快捷键帮助
- **实验性橡皮擦模块**：独立的物理橡皮擦域（含粒子/音效相关实现）
- **桌面端支持**：提供 Electron 壳层，可构建桌面应用

## 技术栈

- **前端框架**：React 18 + TypeScript
- **状态管理**：Zustand（按 slice 划分状态）
- **绘制引擎**：Canvas API + perfect-freehand
- **样式系统**：Tailwind CSS
- **构建工具**：Vite
- **测试工具**：Vitest + Testing Library
- **导出库**：jsPDF
- **桌面壳层**：Electron + electron-builder

## 项目结构

```text
src/
├── canvas/              # 画布绘制、图元规则、导出相关纯逻辑
├── components/          # UI 组件与交互 hooks（canvas/toolbar/sidebar 等）
├── eraser/              # 物理橡皮擦域（引擎、渲染、偏好、测试）
├── store/               # Zustand 状态、持久化、迁移、类型
├── App.tsx              # 主应用组装
└── main.tsx             # Web 入口

electron/
└── main.ts              # Electron 主进程入口
```

## 快速开始

### 环境要求

- Node.js `>= 22.22.1`
- npm

### 安装与运行（Web）

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

默认开发地址：`http://localhost:3000`

### 运行桌面版（开发）

```bash
npm run dev:desktop
```

## 常用命令

```bash
npm run dev            # Web 开发
npm run dev:desktop    # Web + Electron 联合开发
npm run build          # TypeScript 检查 + Vite 构建
npm run build:desktop  # Web 构建 + Electron 打包
npm run preview        # 预览构建产物
npm run lint           # ESLint
npm run test           # Vitest watch
npm run test:run       # Vitest 单次运行
npm run test:coverage  # 测试覆盖率
```

## 数据与隐私

MindNotes Pro 采用本地优先策略：应用数据由本地存储机制管理（见 `src/store/storage.ts` 与 `saveManager.ts`），默认不依赖云端账号体系。

## 贡献

欢迎提交 Issue / PR：

1. Fork 仓库并创建分支
2. 完成修改并通过 `lint`、`test`、`build`
3. 发起 Pull Request

可参考：`CONTRIBUTING.md`、`ARCHITECTURE.md`、`SECURITY.md`

## 相关文档

- 架构说明：`ARCHITECTURE.md`
- 变更记录：`CHANGELOG.md`
- 路线图：`ROADMAP.md`

---

如果这个项目对你有帮助，欢迎点一个 ⭐。
