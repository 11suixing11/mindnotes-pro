<div align="center">

<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

**一款漂亮的本地白板画图应用，用起来像在纸上画画一样自然。**

不联网、不追踪、不收费。打开就画。

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/✨_立即体验-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="立即体验" /></a>
  &nbsp;
  <a href="#快速开始"><img src="https://img.shields.io/badge/📦_快速开始-2ECC71?style=for-the-badge" alt="快速开始" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/仅_3_个运行时依赖-green" alt="仅 3 个运行时依赖" />
</p>

<p>
  <strong>🌐 语言：</strong>
  <a href="README.md">English</a> ·
  <strong>中文</strong> ·
  <a href="README_JA.md">日本語</a>
</p>

</div>

---

## 先看效果

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro 演示" width="80%" />
</div>

---

## 为什么你会喜欢它

<table>
<tr>
<td width="50%">

### 🎨 像画画，不像用软件

灵感来自**莫奈的印象派调色板** —— 水彩渐变背景、毛玻璃面板、纸张纹理，让数字绘画温暖而有人情味。六种独特笔刷：钢笔、荧光笔、铅笔、书法笔、虚线笔、彩虹发光笔。

### 🔒 你的想法只属于你

**所有数据都在浏览器里。** 不需要注册账号，没有服务器，没有"登录后保存"。数据永远不会离开你的设备 —— 甚至可以作为 PWA 离线使用。

### ⚡ 零臃肿，秒加载

只有 **3 个运行时依赖**。不到一秒加载完成。不是 50MB 的 Electron 应用，没有加载转圈 —— 一个随时待命的白板。

</td>
<td width="50%">

### 📝 可视化思考

- ✏️ 手绘笔触，**6 种笔刷风格**
- 🔷 图形工具 —— 矩形、圆形、线条、箭头
- 📝 内联文字注释
- 🖼️ 直接粘贴图片到画布
- 🖱️ 框选、缩放、移动、吸附对齐
- ↩️ 完整的撤销/重做历史
- 🌙 暗色模式（自动跟随系统）
- 📄 导出为 **PDF** 或 **PNG**

### 🗂️ 井井有条

- 多文档工作区
- 文件夹层级管理
- 自动保存到 localStorage
- 重命名、复制、删除 —— 全部本地完成

</td>
</tr>
</table>

---

## 谁适合用？

| 你是...                 | MindNotes Pro 帮你...              |
| ----------------------- | ---------------------------------- |
| 🎓 **学生**             | 上课时快速画图、标注知识点         |
| 💡 **设计师**           | 不开 Figma 也能快速草拟方案        |
| 👩‍💻 **开发者**           | 白板上画系统架构和流程图           |
| 📋 **笔记爱好者**       | 在同一块画布上混合手写、图形和文字 |
| 🧠 任何**视觉化思考者** | 把脑子里的想法倒到画布上 —— 立刻   |

---

## 截图

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>☀️ 亮色模式</strong></td>
      <td align="center"><strong>🌙 暗色模式</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="420" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="420" /></td>
    </tr>
  </table>
</div>

---

## 快捷键

在应用中按 `?` 查看全部快捷键。常用快捷键：

| 快捷键                | 功能                      |
| --------------------- | ------------------------- |
| `P`                   | 画笔                      |
| `E`                   | 橡皮擦                    |
| `S`                   | 选择工具                  |
| `T`                   | 文字工具                  |
| `R` / `C` / `L` / `A` | 矩形 / 圆形 / 线条 / 箭头 |
| `Space` + 拖拽        | 平移画布                  |
| `Ctrl` + `Z` / `Y`    | 撤销 / 重做               |
| `Ctrl` + `A`          | 全选                      |
| `Ctrl` + `C` / `V`    | 复制 / 粘贴               |
| `Ctrl` + `E`          | 导出菜单                  |
| `Delete`              | 删除选中                  |
| `滚轮`                | 缩放                      |
| `Dark/Light`          | 切换主题                  |

---

## 快速开始

### 直接打开

👉 **[打开 MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** —— 无需安装，无需注册。

### 本地运行

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) —— 30 秒内开始画画。

### 部署你自己的

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  &nbsp;
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

---

## 和同类产品对比

|                | MindNotes Pro | Excalidraw | tldraw  | Miro |
| -------------- | :-----------: | :--------: | :-----: | :--: |
| **开源**       |    ✅ MIT     |   ✅ MIT   | ⚠️ 部分 |  ❌  |
| **本地优先**   |      ✅       |     ❌     |   ❌    |  ❌  |
| **运行时依赖** |     **3**     |    30+     |   50+   | N/A  |
| **离线 PWA**   |      ✅       |     ⚠️     |   ❌    |  ❌  |
| **文档管理**   |      ✅       |     ❌     |   ❌    |  ✅  |
| **自定义美学** |   ✅ 莫奈风   | ✅ 手绘风  | ⚠️ 基础 |  ✅  |
| **永久免费**   |      ✅       |     ✅     |   ⚠️    |  ❌  |

---

## 技术栈

| 层级 | 选型                                  | 原因                    |
| ---- | ------------------------------------- | ----------------------- |
| UI   | React 18 + TypeScript                 | 类型安全、高性能        |
| 状态 | Zustand（6 个 slice）                 | 极小、无样板代码        |
| 绘图 | perfect-freehand + Canvas API         | 自然笔触                |
| 样式 | Tailwind CSS + 莫奈配色               | 默认就很美              |
| 导出 | jsPDF（懒加载）                       | 不影响首屏加载          |
| 构建 | Vite 5                                | 即时 HMR                |
| 测试 | Vitest + Testing Library + Playwright | 245+ 单元测试，E2E 就绪 |

---

## 参与贡献

我们欢迎任何形式的帮助 —— Bug 报告、功能建议、或者 Pull Request。

- 🐛 **发现了 Bug？** → [提交 Issue](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **有好点子？** → [请求功能](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **想写代码？** → 阅读 [CONTRIBUTING.md](CONTRIBUTING.md)
- ⭐ **喜欢这个项目？** → 给个 Star —— 这真的能帮助更多人发现它

新手请找 [`good first issue`](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) 标签。

---

## 架构

<div align="center">
  <img src=".github/architecture.svg" alt="架构图" width="600" />
</div>

---

## Star 历史

<div align="center">
  <a href="https://star-history.com/#11suixing11/mindnotes-pro&Date">
    <img src="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" alt="Star History" width="600" />
  </a>
</div>

---

## 许可证

[MIT](LICENSE) —— 随便用。

---

<div align="center">

**由 [11suixing11](https://github.com/11suixing11) 用 ❤️ 构建**

<sub>如果 MindNotes Pro 让你免于为了一个简单草图而打开 Figma —— 给它一个 ⭐</sub>

</div>
