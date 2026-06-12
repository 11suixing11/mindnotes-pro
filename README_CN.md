<div align="center">

<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

### 美观、隐私优先、支持离线使用的白板画图应用 ✨

<p>
  <strong>绘制、草图、整理你的想法</strong>，享受直觉式的画布体验。
  <br/>无云端。无追踪。只有你的创造力。
</p>

<p>
  <strong>🌐 语言：</strong>
  <a href="README.md">English</a> ·
  <strong>中文</strong> ·
  <a href="README_JA.md">日本語</a>
</p>

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/🚀_在线体验-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="在线体验" /></a>
  <a href="#快速开始"><img src="https://img.shields.io/badge/📦_快速开始-2ECC71?style=for-the-badge" alt="快速开始" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/dependencies-3-green" alt="Only 3 dependencies" />
</p>

</div>

---

## 🎬 演示

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro 演示" width="80%" />
</div>

---

## ✨ 为什么选择 MindNotes Pro？

<table>
<tr>
<td width="50%">

### 🎨 精美设计
灵感源自莫奈的印象派调色板 — 水彩渐变、玻璃拟态效果和纸张纹理，让数字绘画体验更加自然。

### 🔒 隐私优先
**零云端依赖。** 所有数据通过 localStorage 保存在浏览器中。无需账户，无追踪，无服务器。

### ⚡ 闪电般快速
仅有 **3 个核心依赖**（React、Zustand、perfect-freehand）。加载时间不到 1 秒。支持 PWA 离线使用。

</td>
<td width="50%">

### 📝 功能丰富
- 支持压感的手绘笔触
- 图形工具（矩形、线条、箭头）
- 内联文字注释
- 多选、缩放和移动
- 撤销/重做历史栈
- 暗色模式（自动检测系统主题）
- PDF/PNG 导出
- 带文件夹的文档管理

### 🛠 开发者友好
- TypeScript 严格模式
- Zustand slice 架构
- 完整的测试套件
- 清晰、有文档的代码库

</td>
</tr>
</table>

---

## 🚀 快速开始

### 在线体验
👉 **[打开 MindNotes Pro](https://11suixing11.github.io/mindnotes-pro)** — 无需安装！

### 本地运行

`ash
# 克隆并 30 秒内启动
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
`

打开 [http://localhost:3000](http://localhost:3000) 即可开始绘画！

### 一键部署

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

---

## 📸 截图

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>亮色模式</strong></td>
      <td align="center"><strong>暗色模式</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="400" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="400" /></td>
    </tr>
  </table>
</div>

---

## 🏗 技术栈

| 层级 | 技术 | 选择理由 |
|------|------|----------|
| UI | React 18 + TypeScript | 类型安全、现代化 |
| 状态管理 | Zustand（6 个 slice） | 轻量、高性能 |
| 绘图 | perfect-freehand + Canvas | 自然笔触 |
| 样式 | Tailwind CSS | 快速开发 |
| 导出 | jsPDF（动态导入） | 零打包影响 |
| 构建 | Vite 5 | 即时 HMR |
| 测试 | Vitest + Testing Library | 快速、可靠 |

---

## 📊 对比

| 特性 | MindNotes Pro | Excalidraw | tldraw | Miro |
|------|:---:|:---:|:---:|:---:|
| **开源** | ✅ MIT | ✅ MIT | ⚠️ 部分 | ❌ |
| **本地优先** | ✅ | ❌ | ❌ | ❌ |
| **零依赖** | ✅ (3) | ❌ (30+) | ❌ (50+) | ❌ |
| **离线 PWA** | ✅ | ⚠️ | ❌ | ❌ |
| **文档管理** | ✅ | ❌ | ❌ | ✅ |
| **自定义美学** | ✅ 莫奈风格 | ✅ 手绘风 | ⚠️ 基础 | ✅ |
| **永久免费** | ✅ | ✅ | ⚠️ | ❌ |

---

## 🤝 参与贡献

我们欢迎各种形式的贡献！无论是报告 Bug、提出功能建议，还是提交代码。

- 🐛 **发现 Bug？** [提交 Issue](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **有好想法？** [请求功能](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **想写代码？** 查看 [CONTRIBUTING.md](CONTRIBUTING.md)
- ⭐ **喜欢这个项目？** 给个 Star 支持一下！

查看 [good first issue](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) 标签 — 非常适合新手入门。

---

## 🌟 Star 历史

<div align="center">
  <a href="https://star-history.com/#11suixing11/mindnotes-pro&Date">
    <img src="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" alt="Star History" width="600" />
  </a>
</div>

---

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

---

<div align="center">

**由 [11suixing11](https://github.com/11suixing11) 用 ❤️ 构建**

<p>
  <sub>如果你觉得 MindNotes Pro 有用，请考虑给个 ⭐ — 这能帮助更多人发现这个项目！</sub>
</p>

</div>
