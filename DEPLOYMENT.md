# 📦 部署指南

> 将 MindNotes Pro 部署到生产环境

---

## 🎯 部署方式

### 推荐平台

| 平台 | 特点 | 免费额度 |
|------|------|---------|
| **Vercel** | 自动部署、全球 CDN | ✅ 无限 |
| **Netlify** | 简单配置、表单支持 | ✅ 无限 |
| **Cloudflare Pages** | 快速、安全 | ✅ 无限 |
| **GitHub Pages** | 免费、简单 | ✅ 无限 |

---

## 🚀 方式一：Vercel 部署（推荐）

### 步骤 1：推送代码到 GitHub

```bash
cd /home/admin/openclaw/workspace/mindnotes-pro

git remote add origin https://github.com/11suixing11/mindnotes-pro.git
git push -u origin main
```

### 步骤 2：在 Vercel 导入项目

1. 访问 [Vercel](https://vercel.com/new)
2. 点击 "Import Git Repository"
3. 选择 `mindnotes-pro` 仓库
4. 点击 "Import"

### 步骤 3：配置构建设置

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

### 步骤 4：部署

点击 "Deploy"，等待构建完成

**部署成功后**：
- 获得免费域名：`https://mindnotes-pro.vercel.app`
- 自动 HTTPS
- 全球 CDN 加速

### 步骤 5：自定义域名（可选）

在 Vercel 设置中添加自定义域名

---

## 🚀 方式二：Netlify 部署

### 步骤 1：创建 netlify.toml

在项目根目录创建 `netlify.toml`：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 步骤 2：推送到 GitHub

```bash
git add netlify.toml
git commit -m "chore: 添加 Netlify 配置"
git push
```

### 步骤 3：在 Netlify 导入

1. 访问 [Netlify](https://app.netlify.com/)
2. 点击 "Add new site" → "Import an existing project"
3. 选择 GitHub 仓库
4. 构建设置会自动识别
5. 点击 "Deploy site"

---

## 🚀 方式三：手动部署到任意服务器

### 步骤 1：构建项目

```bash
npm run build
```

输出目录：`dist/`

### 步骤 2：上传到服务器

```bash
# 使用 scp 上传
scp -r dist/* user@your-server:/var/www/mindnotes/

# 或使用 rsync
rsync -avz dist/ user@your-server:/var/www/mindnotes/
```

### 步骤 3：配置 Nginx

```nginx
server {
    listen 80;
    server_name mindnotes.your-domain.com;
    root /var/www/mindnotes;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 启用 Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 步骤 4：配置 HTTPS

```bash
# 使用 Let's Encrypt
sudo certbot --nginx -d mindnotes.your-domain.com
```

---

## 🚀 方式四：Docker 部署

### 步骤 1：创建 Dockerfile

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 步骤 2：创建 nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 步骤 3：构建和运行

```bash
# 构建镜像
docker build -t mindnotes-pro .

# 运行容器
docker run -d -p 80:80 mindnotes-pro
```

### 步骤 4：Docker Compose（可选）

```yaml
version: '3.8'
services:
  mindnotes:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

---

## 📊 性能优化

### 构建优化

```json
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['perfect-freehand', 'jspdf', 'file-saver']
        }
      }
    }
  }
})
```

### 资源优化

- ✅ 启用 Gzip/Brotli 压缩
- ✅ 使用 CDN 加速静态资源
- ✅ 启用浏览器缓存
- ✅ 压缩图片资源
- ✅ 代码分割和懒加载

### 性能指标目标

| 指标 | 目标 | 当前 |
|------|------|------|
| LCP | < 2.5s | ~1.5s ✅ |
| FID | < 100ms | ~50ms ✅ |
| CLS | < 0.1 | ~0.05 ✅ |
| 首屏加载 | < 2s | ~1.2s ✅ |

---

## 🔒 安全建议

### 生产环境配置

1. **启用 HTTPS**
   ```bash
   certbot --nginx -d your-domain.com
   ```

2. **配置 CSP**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
   ```

3. **禁用调试信息**
   ```typescript
   // 生产环境禁用
   if (process.env.NODE_ENV === 'production') {
     console.log = () => {}
   }
   ```

4. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

---

## 📈 监控和分析

### 推荐工具

| 工具 | 用途 | 价格 |
|------|------|------|
| **Google Analytics** | 访问统计 | 免费 |
| **Sentry** | 错误监控 | 免费额度 |
| **Vercel Analytics** | 性能监控 | 免费 |
| **Lighthouse** | 性能测试 | 免费 |

### 添加 Google Analytics

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🐛 故障排查

### 常见问题

#### 1. 构建失败

```bash
# 清除缓存
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. 路由 404

确保配置了 SPA 回退：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

#### 3. 静态资源 404

检查 `base` 配置：

```typescript
// vite.config.ts
export default defineConfig({
  base: './',  // 相对路径
})
```

---

## 📞 需要帮助？

- **部署问题**: 查看 [GitHub Issues](https://github.com/11suixing11/mindnotes-pro/issues)
- **社区讨论**: [GitHub Discussions](https://github.com/11suixing11/mindnotes-pro/discussions)

---

**祝部署顺利！** 🚀
