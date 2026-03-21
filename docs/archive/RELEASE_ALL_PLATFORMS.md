# 🌍 MindNotes Pro 全平台发布

> 一次构建，处处运行

**发布日期**: 2026-03-19  
**版本**: v1.1.2

---

## 📦 可用下载

### 桌面端

| 平台 | 文件 | 大小 | 下载 |
|------|------|------|------|
| **Linux** | `.AppImage` | 138MB | [下载](https://github.com/11suixing11/mindnotes-pro/releases/download/v1.1.2/MindNotes.Pro-1.1.2.AppImage) |
| **Windows** | `.exe` | ~150MB | [下载](https://github.com/11suixing11/mindnotes-pro/releases/download/v1.1.2/MindNotes.Pro.Setup.1.1.2.exe) |
| **macOS** | `.dmg` | ~160MB | [下载](https://github.com/11suixing11/mindnotes-pro/releases/download/v1.1.2/MindNotes.Pro-1.1.2.dmg) |

### 移动端

| 平台 | 文件 | 大小 | 下载 |
|------|------|------|------|
| **Android** | `.apk` | ~50MB | [下载](https://github.com/11suixing11/mindnotes-pro/releases/download/v1.1.2/MindNotes.Pro-1.1.2.apk) |
| **iOS** | `.ipa` | ~60MB | 待发布 |

### Web

**在线使用**: https://mindnotes-pro.vercel.app

---

## 🚀 安装指南

### Linux (AppImage)

```bash
# 下载后
chmod +x MindNotes.Pro-1.1.2.AppImage
./MindNotes.Pro-1.1.2.AppImage
```

### Windows

1. 下载 `.exe` 文件
2. 双击运行安装
3. 完成！

### macOS

1. 下载 `.dmg` 文件
2. 双击打开
3. 拖拽到 Applications 文件夹

### Android

1. 下载 `.apk` 文件
2. 允许"未知来源"安装
3. 安装并打开

---

## 📊 构建状态

| 平台 | 状态 | 自动化 |
|------|------|--------|
| Linux | ✅ 完成 | GitHub Actions |
| Windows | ⏳ 待打包 | GitHub Actions |
| macOS | ⏳ 待打包 | GitHub Actions |
| Android | ⏳ 待打包 | GitHub Actions |
| iOS | 📅 计划中 | 手动 |

---

## 🛠️ 本地构建

### 桌面端

```bash
npm install
npm run electron:build
```

### Android

```bash
npm install
npx cap sync android
cd android
./gradlew assembleRelease
```

---

## 📝 更新日志

### v1.1.2

**新增**:
- ✅ 悬浮笔记组件
- ✅ 桌面应用打包
- ✅ Android 支持
- ✅ 快捷键支持
- ✅ 位置记忆

**优化**:
- ✅ 动画流畅度
- ✅ 拖拽性能
- ✅ 构建配置

---

## 🙏 致谢

感谢所有开源项目的支持！

---

## 📞 联系我们

- 📧 Email: 1977717178@qq.com
- 💬 QQ: 1977717178
- 🐛 Issues: https://github.com/11suixing11/mindnotes-pro/issues

---

**让灵感自由流淌 - MindNotes Pro** 🧠✨
