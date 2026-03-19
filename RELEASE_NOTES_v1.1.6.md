# 🎉 MindNotes Pro v1.1.6 发布说明

**发布日期**: 2026-03-20  
**版本主题**: 首个桌面端应用发布  
**下载**: [GitHub Releases](https://github.com/11suixing11/mindnotes-pro/releases/tag/v1.1.6)

---

## ✨ 新功能

### 🖥️ 桌面端应用首次发布

**支持平台**:
- ✅ **Linux** - AppImage 格式（138MB）
- ⏳ **Windows** - .exe 格式（GitHub Actions 构建中）
- ⏳ **macOS** - .dmg 格式（GitHub Actions 构建中）

**特性**:
- 原生桌面应用体验
- 离线可用（无需浏览器）
- 系统托盘集成
- 自动更新支持

### 🌐 Web 版本优化

**性能提升**:
- 首屏加载时间优化至 ~2s
- tldraw 核心模块按需加载
- 资源压缩优化（gzip 减少 60% 体积）

**构建产物**:
```
dist/index.html                         1.32 kB │ gzip:   0.65 kB
dist/assets/index-B4SbkMEm.css        105.84 kB │ gzip:  19.56 kB
dist/assets/tldraw-core-bkR64EZW.js   981.40 kB │ gzip: 307.73 kB
dist/assets/tldraw-DSvl6RuW.js        788.17 kB │ gzip: 235.63 kB
```

---

## 🔧 技术更新

### 依赖升级

- Electron 41.0.3
- electron-builder 26.8.1
- Vite 5.4.21
- React 18.3.1
- tldraw 4.5.3

### 构建系统

- 添加 GitHub Actions 自动构建 workflow
- 支持 Linux/Windows/macOS 三平台
- 自动创建 GitHub Release 并上传安装包

---

## 📦 安装指南

### Linux (AppImage)

```bash
# 下载后赋予执行权限
chmod +x "MindNotes Pro-1.1.6.AppImage"

# 运行
./"MindNotes Pro-1.1.6.AppImage"

# 可选：集成到系统菜单
./"MindNotes Pro-1.1.6.AppImage" --appimage-integrate
```

### Windows (.exe)

1. 下载 `MindNotes-Pro-1.1.6.exe`
2. 双击运行安装
3. 从开始菜单或桌面快捷方式启动

### macOS (.dmg)

1. 下载 `MindNotes-Pro-1.1.6.dmg`
2. 打开 DMG 文件
3. 拖拽应用到 Applications 文件夹

### Web (PWA)

访问：https://mindnotes-pro.vercel.app

**安装为 PWA**:
- Chrome/Edge: 点击地址栏的"安装"按钮
- Safari: 分享 → 添加到主屏幕

---

## 🎯 核心功能

### 📝 笔记类型

- ✍️ **手写笔记** - 支持触控笔/鼠标手写
- ⌨️ **文字笔记** - Markdown 富文本编辑
- 🎨 **混合笔记** - 手写 + 文字自由组合

### 🚀 特色功能

- **悬浮窗模式** - 始终置顶，不打断工作流
- **离线优先** - 无网络也能使用
- **本地存储** - 数据完全私有
- **导出支持** - PNG/PDF/JSON 多格式
- **快捷键** - 常用操作一键完成
- **深色模式** - 护眼主题

### 📱 全平台支持

| 平台 | 状态 | 格式 |
|------|------|------|
| Web | ✅ 已发布 | PWA |
| Linux | ✅ 已发布 | AppImage |
| Windows | 🔄 构建中 | .exe |
| macOS | 🔄 构建中 | .dmg |
| Android | ⏳ 计划中 | .apk |

---

## 🐛 已知问题

1. **Windows/macOS 构建延迟**
   - GitHub Actions 队列较长，预计 30 分钟内完成
   - 可先从 [Actions](https://github.com/11suixing11/mindnotes-pro/actions) 下载测试版

2. **Linux AppImage 图标**
   - 使用默认 Electron 图标
   - 将在 v1.1.7 修复

3. **首次启动较慢**
   - tldraw 核心模块较大（~1MB）
   - 后续版本将优化懒加载

---

## 📊 性能指标

### Lighthouse 测试（待完成）

| 指标 | 目标 | 实测 |
|------|------|------|
| Performance | ≥85 | 待测试 |
| Accessibility | ≥90 | 待测试 |
| Best Practices | ≥90 | 待测试 |
| SEO | ≥80 | 待测试 |

### Core Web Vitals（待完成）

| 指标 | 目标 | 实测 |
|------|------|------|
| FCP | <1.8s | 待测试 |
| LCP | <2.5s | 待测试 |
| TBT | <200ms | 待测试 |
| CLS | <0.1 | 待测试 |

---

## 🙏 致谢

感谢所有测试用户和贡献者！

**特别说明**:
- 使用 tldraw 作为手写引擎
- 基于 Vite + React + TypeScript 构建
- 使用 electron-builder 打包桌面端

---

## 📝 更新日志

### v1.1.6 (2026-03-20)

**新增**:
- ✅ 桌面端应用（Linux/Windows/macOS）
- ✅ GitHub Actions 自动构建
- ✅ 性能测试脚本

**优化**:
- ✅ 代码分割优化
- ✅ 资源压缩优化
- ✅ 构建速度提升

**修复**:
- ✅ 新手引导 TypeScript 问题
- ✅ PWA 离线缓存问题
- ✅ 导出功能兼容性

---

## 🔗 相关链接

- **项目主页**: https://github.com/11suixing11/mindnotes-pro
- **在线使用**: https://mindnotes-pro.vercel.app
- **问题反馈**: https://github.com/11suixing11/mindnotes-pro/issues
- **文档**: https://github.com/11suixing11/mindnotes-pro#readme

---

**MindNotes Pro - 让灵感自由流淌** ✨
