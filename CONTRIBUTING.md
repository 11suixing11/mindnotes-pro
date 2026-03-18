# 🤝 参与贡献

> 欢迎一起把 MindNotes Pro 做得更好！

**我们欢迎所有形式的贡献**，无论大小！

---

## 🎯 快速导航

- **[🚀 立即开始](#-立即开始)** - 3 分钟上手
- **[💻 开发环境](#-开发环境)** - 配置开发
- **[🐛 报告问题](#-报告问题)** - 提交 Bug
- **[💡 建议功能](#-建议功能)** - 提交想法
- **[📝 提交代码](#-提交代码)** - 提交 PR
- **[📖 代码规范](#-代码规范)** - 编码要求
- **[🎁 贡献奖励](#-贡献奖励)** - 感谢名单

---

## 🚀 立即开始

### 方式一：在线体验（推荐新手）

```
1. 访问：https://mindnotes-pro.vercel.app
2. 使用产品
3. 提交反馈
```

**适合**：想了解项目、提建议

---

### 方式二：本地开发（推荐开发者）

```bash
# 1. Fork 项目
# 访问项目页面 → 右上角 "Fork"

# 2. 克隆到本地
git clone https://github.com/YOUR_USERNAME/mindnotes-pro.git
cd mindnotes-pro

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev

# 5. 开始修改代码
# 浏览器自动刷新：http://localhost:3000
```

**预计时间**：5 分钟

---

## 💻 开发环境

### 前置要求

| 软件 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| npm | 9+ | 包管理 |
| Git | 最新 | 版本控制 |
| 编辑器 | VS Code（推荐） | 代码编辑 |

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

浏览器自动打开：http://localhost:3000

### 构建生产版本

```bash
npm run build
```

输出目录：`dist/`

### 预览生产版本

```bash
npm run preview
```

---

## 🐛 报告问题

### 发现 Bug？

**步骤**：

1. **搜索现有 Issue** - 可能已经有人报告了
2. **创建新 Issue** - https://github.com/11suixing11/mindnotes-pro/issues/new
3. **填写模板** - 提供详细信息

### Bug 报告模板

```markdown
**问题描述**
简要描述问题

**复现步骤**
1. 打开...
2. 点击...
3. 出现...

**预期行为**
应该发生什么

**实际行为**
实际发生了什么

**截图**
如果适用，添加截图

**环境信息**
- 操作系统：Windows 11 / macOS 13 / Ubuntu 22.04
- 浏览器：Chrome 120 / Firefox 115 / Safari 16
- 版本号：v1.0.0

**补充信息**
其他相关信息
```

---

## 💡 建议功能

### 有新想法？

**步骤**：

1. **搜索现有讨论** - 看看是否有人提过
2. **创建新 Issue** - 选择 "Feature Request"
3. **描述清楚** - 说明用途和场景

### 功能建议模板

```markdown
**功能描述**
简要描述想要的功能

**使用场景**
这个功能会用在什么场景

**实现建议**
如果有想法，描述如何实现

**替代方案**
是否考虑过其他解决方案

**补充信息**
其他相关信息
```

---

## 📝 提交代码

### 准备提交

**步骤**：

1. **Fork 项目** - 创建你自己的副本
2. **创建分支** - `git checkout -b feature/amazing-feature`
3. **修改代码** - 实现功能或修复 Bug
4. **测试** - 确保功能正常
5. **提交** - `git commit -m 'feat: add amazing feature'`
6. **推送** - `git push origin feature/amazing-feature`
7. **创建 PR** - 访问你的 Fork 页面，点击 "Compare & pull request"

### 分支命名

| 类型 | 格式 | 例子 |
|------|------|------|
| 新功能 | `feature/功能名` | `feature/dark-mode` |
| Bug 修复 | `fix/问题描述` | `fix/save-error` |
| 文档更新 | `docs/内容` | `docs/readme-update` |
| 重构 | `refactor/模块` | `refactor/canvas` |
| 性能优化 | `perf/优化内容` | `perf/render-speed` |

### 提交信息规范

**格式**：
```
<类型>: <简短描述>

[可选的详细说明]

[可选的关联 Issue]
```

**类型**：
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `test` - 添加测试
- `chore` - 构建/工具相关

**例子**：
```
feat: 添加深色模式支持

- 添加深色主题配置
- 更新所有组件样式
- 添加主题切换按钮

Closes #123
```

---

## 📖 代码规范

### TypeScript

```typescript
// ✅ 好的：使用类型注解
const userName: string = 'Alice'
const age: number = 25

// ✅ 好的：函数有返回值类型
function greet(name: string): string {
  return `Hello, ${name}!`
}

// ✅ 好的：接口定义清晰
interface User {
  id: number
  name: string
  email: string
}

// ❌ 差的：避免使用 any
const data: any = {} // 不好
const data: Record<string, unknown> = {} // 好
```

### React

```tsx
// ✅ 好的：使用函数组件 + Hooks
const Canvas: React.FC<CanvasProps> = (props) => {
  const { strokes, onAddStroke } = props
  
  return (
    <canvas onClick={handleClick} />
  )
}

// ✅ 好的：使用 TypeScript 类型
interface CanvasProps {
  strokes: Stroke[]
  onAddStroke: (stroke: Stroke) => void
}

// ✅ 好的：组件职责单一
const Toolbar = () => { /* 只负责工具栏 */ }
const SaveDialog = () => { /* 只负责保存对话框 */ }
```

### CSS (Tailwind)

```html
<!-- ✅ 好的：使用 Tailwind 工具类 -->
<button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  保存
</button>

<!-- ❌ 差的：避免内联样式 -->
<button style="padding: 8px 16px; background: blue;">
  保存
</button>
```

### 文件组织

```
src/
├── components/          # React 组件
│   ├── Canvas.tsx      # 画布组件
│   ├── Toolbar.tsx     # 工具栏
│   └── SaveDialog.tsx  # 保存对话框
├── store/              # 状态管理
│   └── useAppStore.ts  # Zustand store
├── utils/              # 工具函数
│   ├── export.ts       # 导出功能
│   └── storage.ts      # 存储功能
└── App.tsx             # 主应用
```

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- Canvas.test.tsx

# 生成覆盖率报告
npm test -- --coverage
```

### 编写测试

```typescript
// ✅ 好的：测试用例清晰
describe('Canvas', () => {
  it('应该能正常渲染', () => {
    // 测试代码
  })
  
  it('应该能响应鼠标事件', () => {
    // 测试代码
  })
})
```

---

## 📚 开发资源

### 技术文档

- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vite 文档](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [perfect-freehand](https://github.com/steveruizok/perfect-freehand)

### 项目文档

- [架构说明](./架构说明.md)
- [API 文档](./API 文档.md)
- [部署指南](./部署指南 - 完整版.md)

---

## 🎁 贡献奖励

### 感谢名单

所有贡献者都会出现在这里：

👉 [贡献者列表](https://github.com/11suixing11/mindnotes-pro/graphs/contributors)

### 贡献等级

| 贡献类型 | 奖励 |
|---------|------|
| **报告 Bug** | 🙏 感谢 + Issue 标记 |
| **建议功能** | 💡 感谢 + 讨论参与 |
| **修复小问题** | 🐛 感谢 + PR 合并 |
| **实现功能** | ⭐ 感谢 + 贡献者名单 |
| **重大贡献** | 🏆 特别感谢 + 核心贡献者 |

### 成为核心贡献者

如果你持续贡献高质量代码，可以成为核心贡献者：

- 有权限直接提交代码
- 参与项目决策
- 审核其他贡献者的 PR
- 在 README 中展示

---

## ❓ 常见问题

### Q: 我是新手，能参与吗？

**当然可以！**

从简单的开始：
- 报告 Bug
- 建议功能
- 改进文档
- 修复小问题

我们会帮助你逐步成长！

---

### Q: 不知道从哪里开始？

**建议**：

1. **使用产品** - 了解项目
2. **查看 Issue** - 找 `good first issue` 标记的问题
3. **从小处着手** - 修复简单的 Bug
4. **提问** - 在 Issue 或 Discussion 中提问

---

### Q: 代码风格不一致怎么办？

**不用担心**！

- 我们有 ESLint 自动检查
- PR 审核时会指出
- 逐步改进就好

---

### Q: 我的英文不好

**没关系**！

- 可以用中文提交 Issue/PR
- 我们会帮忙翻译
- 代码是全球通用语言

---

### Q: 需要签署 CLA 吗？

**不需要**！

提交代码即表示你同意以 MIT 许可证发布你的贡献。

---

## 🌟 优秀贡献者

感谢所有让这个项目变得更好的人：

- [@11suixing11](https://github.com/11suixing11) - 项目创始人
- **你？** - 下一个贡献者！

👉 [查看所有贡献者](https://github.com/11suixing11/mindnotes-pro/graphs/contributors)

---

## 📞 联系方式

- **项目主页**: https://github.com/11suixing11/mindnotes-pro
- **Issue 追踪**: https://github.com/11suixing11/mindnotes-pro/issues
- **讨论区**: https://github.com/11suixing11/mindnotes-pro/discussions

---

<div align="center">

## 🎉 一起创造更好的产品！

**[开始贡献](#-立即开始)** • **[报告问题](#-报告问题)** • **[建议功能](#-建议功能)** • **[提交代码](#-提交代码)**

---

*感谢你的每一份贡献！* ❤️

*开源让这个世界更美好* 🌍

</div>
