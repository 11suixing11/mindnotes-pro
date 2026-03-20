# 🔧 PWA 问题排查与修复

> 确保 PWA 正常工作

**创建时间**: 2026-03-19

---

## ✅ PWA 配置检查

### 1. manifest.json

**位置**: `public/manifest.json`

**状态**: ✅ 存在

**内容**:
```json
{
  "name": "MindNotes Pro",
  "short_name": "MindNotes",
  "start_url": "/",
  "display": "standalone",
  "icons": [...]
}
```

---

### 2. Service Worker

**位置**: `public/sw.js`

**状态**: ✅ 存在

**功能**:
- ✅ 离线缓存
- ✅ 网络优先策略
- ✅ 后台同步
- ✅ 推送通知

---

### 3. Service Worker 注册

**位置**: `src/main.tsx`

**状态**: ✅ 已注册

**代码**:
```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

---

## 🐛 可能的问题

### 1. HTTPS 要求

**问题**: Service Worker 需要 HTTPS

**解决**: 
- ✅ Vercel 自动 HTTPS
- ✅ 本地开发 localhost 豁免

---

### 2. 缓存问题

**问题**: 旧版本缓存

**解决**:
```bash
# 清除缓存
Ctrl+Shift+R (强制刷新)
# 或
F12 → Application → Clear storage
```

---

### 3. manifest.json 路径

**问题**: 路径不对

**检查**:
```html
<link rel="manifest" href="/manifest.json">
```

---

## 🚀 测试步骤

### 本地测试

```bash
# 1. 构建
npm run build

# 2. 预览
npm run preview

# 3. 访问
http://localhost:4173
```

**检查**:
- F12 → Application → Manifest
- F12 → Application → Service Workers
- F12 → Console (查看日志)

---

### 线上测试

**访问**: https://mindnotes-pro.vercel.app

**检查**:
- Chrome: 地址栏右侧有安装图标
- F12 → Application → Manifest
- 离线测试 (断开网络)

---

## 📱 添加到主屏幕

### Android (Chrome)

1. 打开网站
2. 点击菜单 (⋮)
3. "应用" → "安装 MindNotes Pro"
4. 或 "添加到主屏幕"

### iOS (Safari)

1. 打开网站
2. 点击分享按钮
3. "添加到主屏幕"

### 桌面 (Chrome/Edge)

1. 打开网站
2. 地址栏右侧有安装图标
3. 点击安装

---

## 🎯 PWA 要求

| 要求 | 状态 |
|------|------|
| HTTPS | ✅ |
| manifest.json | ✅ |
| Service Worker | ✅ |
| 离线功能 | ✅ |
| 响应式设计 | ✅ |
| 图标 | ✅ |

---

## 🛠️ 调试工具

### Chrome DevTools

**F12 → Application**:
- Manifest: 查看 manifest.json
- Service Workers: 查看 SW 状态
- Cache Storage: 查看缓存
- Storage: 查看 LocalStorage

### Lighthouse

**F12 → Lighthouse**:
- 选择 PWA
- 生成报告
- 查看分数

---

## 📊 PWA 分数目标

| 指标 | 目标 | 当前 |
|------|------|------|
| PWA | ✅ | ✅ |
| Performance | >90 | ? |
| Accessibility | >90 | ? |
| Best Practices | >90 | ? |
| SEO | >90 | ? |

---

## 🚀 优化建议

### 1. 启动画面

**添加**: `splashscreen.png`

**配置**: 在 manifest.json 中

---

### 2. 离线页面

**添加**: `offline.html`

**功能**: 友好提示

---

### 3. 更新提示

**添加**: 新版本可用提示

**代码**:
```typescript
registration.onupdatefound = () => {
  // 提示用户更新
}
```

---

## 💡 常见问题

### Q: 为什么看不到安装提示？

**A**: 
1. 首次访问不会有提示
2. 需要与网站互动一段时间
3. 确保 Service Worker 已注册

---

### Q: 离线不能用？

**A**:
1. 检查 Service Worker 是否激活
2. 清除缓存重新注册
3. 检查缓存策略

---

### Q: 图标不显示？

**A**:
1. 检查图标路径
2. 确保图标文件存在
3. 清除缓存

---

**PWA 应该正常工作！** 🚀

**如果还有问题，检查 Chrome DevTools！** 🔍

**最后更新**: 2026-03-19
