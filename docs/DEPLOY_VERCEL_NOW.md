# 🚀 立即部署到 Vercel

> 5 分钟完成云端部署

**创建时间**: 2026-03-19 14:50  
**状态**: 🔄 准备部署

---

## ✅ 前置条件

- [x] 代码已推送到 GitHub
- [x] Git 标签已创建 (v1.1.1)
- [x] 构建验证通过

---

## 🚀 快速部署步骤

### 第 1 步：访问 Vercel

**网址**: https://vercel.com/new

**登录**: 使用 GitHub 账号

---

### 第 2 步：导入项目

1. **点击**: "Add New..." → "Project"

2. **选择项目**:
   - 找到 `mindnotes-pro`
   - 点击 "Import"

---

### 第 3 步：配置构建

**保持默认配置**:

```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**环境变量**: 不需要

---

### 第 4 步：部署

1. **点击**: "Deploy"

2. **等待构建** (2-3 分钟)

3. **部署成功**
   - 看到 "Congratulations!"
   - 访问分配的域名

---

## 🌐 访问部署

**部署后域名**:
```
https://mindnotes-pro-xxx.vercel.app
```

**测试项目**:
- [ ] 页面加载正常
- [ ] 画布可以绘制
- [ ] 工具切换正常
- [ ] 深色模式可用
- [ ] 导出功能正常
- [ ] 加载动画显示
- [ ] Toast 通知正常
- [ ] 错误处理正常

---

## ⚙️ 自动部署配置

### 生产分支

**Settings** → **Git** → **Production Branch**

设置为：`main`

每次推送到 main 自动部署

---

### 自定义域名（可选）

**Settings** → **Domains**

添加域名：
- 输入你的域名
- 配置 DNS (CNAME)
- 等待生效

---

## 📊 监控

### Vercel Analytics

**Dashboard** → **Analytics**

- 访问量统计
- 性能指标
- 用户来源

### 部署日志

**Dashboard** → **Deployments**

- 构建日志
- 错误追踪
- 回滚功能

---

## 🐛 故障排除

### 构建失败

**检查**:
1. 查看构建日志
2. 确认 package.json 正确
3. 本地运行 `npm run build` 测试

### 部署后功能异常

**检查**:
1. 浏览器控制台错误
2. 网络请求失败
3. 清除缓存重试

---

## 🎊 部署成功后

### 1. 更新链接

**更新以下地方**:
- GitHub README
- GitHub Release
- 社交媒体

**新链接**:
```
https://mindnotes-pro.vercel.app
```

### 2. 社区分享

- V2EX 发帖
- 少数派投稿
- 社交媒体

---

**立即执行部署！** 🚀

**时间**: 2026-03-19 14:50  
**预计完成**: 5 分钟
