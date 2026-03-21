# MindNotes Pro 贡献指南

感谢你为 MindNotes Pro 做出贡献！🎉

## 🚀 快速开始

### 1. Fork 项目

在 GitHub 上点击 Fork 按钮

### 2. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/mindnotes-pro.git
cd mindnotes-pro
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动开发服务器

```bash
npm run dev
```

---

## 📋 开发流程

### 1. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b bugfix/your-bugfix-name
```

**分支命名规范**:
- `feature/xxx` - 新功能
- `bugfix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构
- `test/xxx` - 测试相关

### 2. 开发

- 编写代码
- 运行测试：`npm run test`
- 检查代码风格：`npm run lint`

### 3. 提交

```bash
git add .
git commit -m "type: description"
```

**提交信息规范**:
- `feat: 新功能`
- `fix: Bug 修复`
- `docs: 文档更新`
- `style: 代码格式`
- `refactor: 重构`
- `test: 测试`
- `chore: 构建/工具`

**示例**:
```
feat: 添加深色模式支持
fix: 修复导出 PNG 时的颜色问题
docs: 更新 README 安装说明
```

### 4. 推送

```bash
git push origin feature/your-feature-name
```

### 5. 创建 Pull Request

在 GitHub 上创建 PR，填写：
- PR 描述
- 关联的 Issue
- 测试截图（如适用）

---

## 🐛 报告 Bug

请使用 [Bug 报告模板](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.md)

**好的 Bug 报告包含**:
- ✅ 版本号
- ✅ 操作系统/浏览器
- ✅ 复现步骤
- ✅ 期望行为 vs 实际行为
- ✅ 截图/日志

---

## ✨ 建议功能

请使用 [功能请求模板](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.md)

**好的功能建议包含**:
- ✅ 解决的问题
- ✅ 建议的实现方式
- ✅ 使用场景

---

## 📝 文档贡献

文档改进可以直接提交 PR，包括：
- README 更新
- 使用指南
- API 文档
- 示例代码
- 错别字修正

---

## 🧪 测试

### 运行测试

```bash
npm run test
```

### 测试覆盖率

```bash
npm run test:coverage
```

**目标**: 测试覆盖率 ≥80%

---

## 🎨 代码风格

### ESLint

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

**代码风格指南**:
- 使用 TypeScript
- 使用 ES6+ 语法
- 组件使用函数式写法
- 添加必要的类型定义
- 写清晰的注释

---

## 📦 构建

### 本地构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

---

## 🚢 发布流程

1. 更新版本号 (`package.json`)
2. 更新 CHANGELOG.md
3. 创建 Git Tag
4. 发布 GitHub Release
5. 自动部署到 GitHub Pages

---

## 💬 社区

### Discussions

在 [GitHub Discussions](https://github.com/11suixing11/mindnotes-pro/discussions) 参与讨论：
- 提问求助
- 分享使用技巧
- 讨论功能方向

### Discord/微信群

- Discord: [加入链接]
- 微信群：扫码加入

---

## 🎯 优先处理的 Issue

查看 [good first issue](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) 标签，适合新手贡献者

---

## 📞 联系方式

- Email: [your-email@example.com]
- Twitter: [@your-handle]
- 微信公众号：[你的公众号]

---

## 🙏 致谢

感谢所有为 MindNotes Pro 做出贡献的开发者！

<a href="https://github.com/11suixing11/mindnotes-pro/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=11suixing11/mindnotes-pro" />
</a>

---

**一起让 MindNotes Pro 更好！** 🚀
