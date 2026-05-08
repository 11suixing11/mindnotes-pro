<div align="center">

<br />

# MindNotes Pro

**暖色纸纹画布笔记本**

<br />

> 打开就能画，能写，能存。
> 不联网，不注册，不打扰。

<br />

<a href="https://11suixing11.github.io/mindnotes-pro/">
  <img src="https://img.shields.io/badge/开始使用-GitHub_Pages-c47a5a?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=b8654a" alt="Launch" />
</a>
&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases/latest">
  <img src="https://img.shields.io/badge/下载离线版-Zip-5c4f3d?style=for-the-badge&labelColor=9c8e7a" alt="Download" />
</a>

<br /><br />

[![Release](https://img.shields.io/github/v/release/11suixing11/mindnotes-pro?style=flat-square&color=c47a5a&labelColor=f5f0e8&label=Latest)](https://github.com/11suixing11/mindnotes-pro/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-c47a5a?style=flat-square&labelColor=f5f0e8)](LICENSE)
![Dependencies](https://img.shields.io/badge/dependencies-3-6a9c5a?style=flat-square&labelColor=f5f0e8)
![CDN](https://img.shields.io/badge/CDN-0-6a9c5a?style=flat-square&labelColor=f5f0e8)
[![CI](https://img.shields.io/github/actions/workflow/status/11suixing11/mindnotes-pro/deploy.yml?style=flat-square&label=CI&color=6a9c5a)](https://github.com/11suixing11/mindnotes-pro/actions)

<br />
<br />

</div>

---

## 它是什么

一个**画布笔记本**。不是白板工具，不是知识库，是能画能写的笔记本。

左侧边栏管理多个画布，右侧画布上自由绘图、书写、插入图片。每个画布独立保存，切换即切换。

**核心特性：**

- 6 种笔刷（钢笔 / 荧光笔 / 铅笔 / 书法笔 / 虚线笔 / 霓虹笔）
- 9 种工具（选择 / 画笔 / 橡皮 / 平移 / 矩形 / 圆形 / 文字 / 直线 / 箭头）
- 文本块：画布上直接打字，可拖拽、缩放、双击编辑
- 选中缩放：拖动四角控制点缩放任意元素
- 6 种导出格式（PNG / JPG / PDF / SVG / Word / JSON）
- 多画布管理：侧栏文件夹 + 画布列表 + 右键菜单
- 自动保存到 IndexedDB，数据永不出浏览器
- 暗色模式 / 自定义背景色 / 小地图导航

<br />

## 为什么做这个

每个白板应用都想让我注册账号、同步到云端、加载 2MB 的 JavaScript。

我只是想要一块画布。

所以做了 MindNotes Pro — 3 个依赖，0 个 CDN，纯本地运行。

<br />

## 快速开始

### 在线使用

> **<https://11suixing11.github.io/mindnotes-pro/>**
>
> 国内直接访问，无需 VPN。

### 下载离线版

从 [Releases](https://github.com/11suixing11/mindnotes-pro/releases/latest) 下载 zip，解压后双击 `index.html` 即可。

### 从源码运行

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

<br />

## 快捷键

| 键 | 功能 | | 键 | 功能 |
|:---|:-----|:--|:---|:-----|
| `0` | 选择 | | `Ctrl` `Z` | 撤销 |
| `1` | 画笔 | | `Ctrl` `⇧` `Z` | 重做 |
| `2` | 橡皮 | | `+` | 放大 |
| `3` | 平移 | | `-` | 缩小 |
| `4` | 矩形 | | `Scroll` | 滚轮缩放 |
| `5` | 圆形 | | `Del` | 删除选中 |
| `6` | 文字 | | | |
| `7` | 直线 | | | |
| `8` | 箭头 | | | |

<br />

## 技术栈

```
React 18  ·  TypeScript 5  ·  Vite 5  ·  Zustand  ·  Canvas API
```

**3 个生产依赖**：`react`、`react-dom`、`zustand`

<br />

## 架构

```
src/
├── App.tsx                    主入口
├── components/
│   ├── Canvas.tsx             统一画布（笔迹 + 形状 + 文本块 + 图片）
│   ├── Sidebar.tsx            侧栏（文件夹 + 画布管理）
│   └── Toolbar.tsx            工具栏
└── store/
    ├── appStore.ts            唯一 store（元素 + 画布 + 文件夹）
    ├── storage.ts             IndexedDB 抽象
    ├── types.ts               CanvasElement 联合类型
    ├── useViewStore.ts        缩放 / 平移
    └── useThemeStore.ts       主题
```

**数据模型：** `CanvasElement = StrokeElement | ShapeElement | TextElement | ImageElement`

所有元素统一存储，统一渲染管线，统一撤销重做。

<br />

## 浏览器支持

| 浏览器 | 状态 |
|:-------|:-----|
| Chrome / Edge 90+ | ✅ |
| Firefox 90+ | ✅ |
| Safari 15+ | ✅ |
| 移动端 Chrome / Safari | ✅ 触屏绘图 |

<br />

## License

[MIT](LICENSE)

<br />

<div align="center">

**用心做的东西，自己会跑。**

<a href="https://11suixing11.github.io/mindnotes-pro/">在线使用</a>
&nbsp;·&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/releases">下载</a>
&nbsp;·&nbsp;
<a href="https://github.com/11suixing11/mindnotes-pro/issues">反馈</a>

<br /><br />

</div>
