# 🖥️ MindNotes Pro 桌面应用打包方案

> 提供可下载的桌面应用

**创建时间**: 2026-03-19  
**状态**: 📝 方案规划

---

## 🎯 打包目标

### 提供下载

- [ ] Windows (.exe / .msi)
- [ ] macOS (.dmg)
- [ ] Linux (.AppImage / .deb)
- [ ] PWA (离线安装)

---

## 💡 技术方案

### 方案一：Electron ⭐ 推荐

**优势**:
- ✅ 成熟稳定
- ✅ 跨平台支持
- ✅ 社区活跃
- ✅ 打包简单

**实现**:
```bash
npm install -D electron electron-builder
```

**输出**:
- Windows: `.exe`, `.msi`
- macOS: `.dmg`
- Linux: `.AppImage`, `.deb`

---

### 方案二：Tauri

**优势**:
- ✅ 体积更小
- ✅ 性能更好
- ✅ 安全性高

**劣势**:
- ⚠️ 需要 Rust 环境
- ⚠️ 学习成本高

---

### 方案三：PWA

**优势**:
- ✅ 已有 PWA 配置
- ✅ 无需额外打包
- ✅ 浏览器原生支持

**劣势**:
- ⚠️ 功能受限
- ⚠️ 不是真正的原生应用

---

## 🚀 推荐方案：Electron

### 实施步骤

#### 第 1 步：安装依赖

```bash
npm install -D electron electron-builder concurrently wait-on
```

#### 第 2 步：配置 package.json

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:preview": "npm run build && electron ."
  },
  "build": {
    "appId": "com.mindnotes.pro",
    "productName": "MindNotes Pro",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"]
    },
    "mac": {
      "target": ["dmg"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

#### 第 3 步：创建 Electron 主进程

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/icon-512.png')
  })

  // 开发环境加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产环境加载构建文件
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

#### 第 4 步：打包

```bash
# 开发测试
npm run electron:dev

# 生产打包
npm run electron:build
```

#### 第 5 步：发布

**输出目录**: `release/`

**文件**:
- `MindNotes Pro Setup.exe` (Windows)
- `MindNotes Pro.dmg` (macOS)
- `MindNotes Pro.AppImage` (Linux)

---

## 📦 Release 内容

### GitHub Release 应包含

```
Assets:
├── MindNotes-Pro-Setup-1.1.2.exe      (Windows 安装程序)
├── MindNotes-Pro-Portable-1.1.2.exe   (Windows 便携版)
├── MindNotes-Pro-1.1.2.dmg            (macOS)
├── MindNotes-Pro-1.1.2.AppImage       (Linux)
├── MindNotes-Pro-1.1.2.deb            (Debian/Ubuntu)
└── source-code.zip                    (源代码)
```

---

## 🎯 立即执行

### P0 - 今天完成

- [ ] 安装 Electron
- [ ] 配置主进程
- [ ] 测试开发模式
- [ ] 打包 Windows 版
- [ ] 上传到 Release

### P1 - 明天完成

- [ ] 打包 macOS 版
- [ ] 打包 Linux 版
- [ ] 完善 Release 说明
- [ ] 提供下载链接

---

## 📊 文件大小预估

| 平台 | 文件大小 | 安装后 |
|------|---------|--------|
| Windows | ~80MB | ~150MB |
| macOS | ~90MB | ~180MB |
| Linux | ~70MB | ~140MB |

---

**立即开始打包！** 🚀
