# 📋 Release 发布检查清单

> 确保每次发布都完整、一致、专业

---

## ✅ 发布前检查

### 代码质量

- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 无严重 Bug
- [ ] 性能测试通过

### 文档更新

- [ ] **README.md** - 版本号、下载链接、功能清单 ✅
- [ ] **CHANGELOG.md** - 更新日志完整
- [ ] **Release Notes** - 发布说明详细
- [ ] **项目主页** - 截图、演示更新

### 版本管理

- [ ] **package.json** - 版本号更新
- [ ] **Git Tag** - 创建并推送
- [ ] **GitHub Release** - 创建 Release
- [ ] **分支管理** - main 分支稳定

---

## 📦 发布流程

### Step 1: 版本准备

```bash
# 1. 更新版本号
# package.json: "version": "1.1.6"

# 2. 更新 README
# - 版本号
# - 下载链接
# - 功能清单

# 3. 提交更改
git add -A
git commit -m "chore: 准备发布 v1.1.6"
```

---

### Step 2: 构建验证

```bash
# 1. 清理构建
npm run clean

# 2. 重新构建
npm run build

# 3. 测试构建产物
npm run preview

# 4. 运行测试
npm test

# 5. 性能测试
npx lighthouse http://localhost:4173
```

---

### Step 3: Git 操作

```bash
# 1. 提交所有更改
git add -A
git commit -m "chore: 发布准备 v1.1.6"

# 2. 推送到 main
git push origin main

# 3. 创建 Tag
git tag -a v1.1.6 -m "Release v1.1.6"

# 4. 推送 Tag
git push origin v1.1.6
```

---

### Step 4: GitHub Release

**访问**: https://github.com/11suixing11/mindnotes-pro/releases/new

**填写内容**:
- Tag version: `v1.1.6`
- Target: `main`
- Title: `MindNotes Pro v1.1.6 - 桌面端发布`

**Release Notes 模板**:
```markdown
## 🎉 新功能

### 桌面端应用
- ✅ Windows .exe 安装包
- ✅ macOS .dmg 安装包
- ✅ Linux .AppImage 安装包

### 性能优化
- ✅ tldraw 懒加载 (首屏优化 60%+)
- ✅ 代码分割优化
- ✅ Bundle 分析工具

## 🐛 Bug 修复

- 修复 XXX 问题
- 优化 XXX 体验

## 📦 下载

### Windows
- [安装包](链接)
- [便携版](链接)

### macOS
- [DMG](链接)

### Linux
- [AppImage](链接)

## 📊 统计

- Commits: XX
- Files changed: XX
- Lines added: +XX
- Lines removed: -XX

## 🙏 致谢

感谢所有贡献者和用户！
```

**上传文件**:
- [ ] Windows .exe
- [ ] macOS .dmg
- [ ] Linux .AppImage
- [ ] 校验和文件

---

### Step 5: 项目主页同步 ✅

**必须更新的文件**:

1. **README.md**
   ```markdown
   **最新版本**: v1.1.6 (日期)
   
   ### 下载链接
   - Windows: v1.1.6 链接
   - macOS: v1.1.6 链接
   - Linux: v1.1.6 链接
   
   ### 更新日志
   ### v1.1.6 新增
   - 新功能 1
   - 新功能 2
   ```

2. **package.json**
   ```json
   {
     "version": "1.1.6"
   }
   ```

3. **CHANGELOG.md**
   ```markdown
   ## [1.1.6] - 2026-03-20
   
   ### Added
   - 新功能 1
   - 新功能 2
   
   ### Changed
   - 优化 1
   - 优化 2
   
   ### Fixed
   - 修复 1
   - 修复 2
   ```

---

### Step 6: 通知渠道

**发布后通知**:

- [ ] **GitHub Issues** - 发布通知
- [ ] **Discord/社区** - 发布消息
- [ ] **Twitter/微博** - 宣传
- [ ] **博客/文章** - 发布文章
- [ ] **邮件列表** - 通知订阅者

**通知模板**:
```
🎉 MindNotes Pro v1.1.6 发布！

✨ 亮点:
- 桌面端应用正式发布
- 性能优化 60%+
- 完全免费开源

📦 下载:
https://github.com/11suixing11/mindnotes-pro/releases/tag/v1.1.6

#MindNotes #开源 #笔记应用
```

---

## 🔍 发布后验证

### 功能验证

- [ ] 下载链接有效
- [ ] 安装包可正常运行
- [ ] 所有功能正常
- [ ] 无严重 Bug

### 文档验证

- [ ] README 显示正确
- [ ] Release Notes 完整
- [ ] 下载说明清晰
- [ ] 截图/演示更新

### 统计监控

- [ ] GitHub Stars 增长
- [ ] 下载量统计
- [ ] Issue/PR 处理
- [ ] 用户反馈收集

---

## 📊 发布清单模板

### 发布前 (1-2 天)

```markdown
## 待办事项

### 代码
- [ ] 修复所有 P0 Bug
- [ ] 完成代码审查
- [ ] 性能测试通过

### 文档
- [ ] 更新 README
- [ ] 更新 CHANGELOG
- [ ] 编写 Release Notes

### 构建
- [ ] 构建所有平台
- [ ] 测试安装包
- [ ] 准备上传文件
```

---

### 发布日

```markdown
## 发布日流程

### 上午
- [ ] 最终代码审查
- [ ] 构建验证
- [ ] 提交代码

### 下午
- [ ] 创建 Git Tag
- [ ] 创建 GitHub Release
- [ ] 上传安装包
- [ ] 更新项目主页

### 晚上
- [ ] 发布通知
- [ ] 监控反馈
- [ ] 处理问题
```

---

### 发布后 (1-3 天)

```markdown
## 发布后跟进

### 监控
- [ ] 收集用户反馈
- [ ] 监控 Issue/PR
- [ ] 统计下载量

### 修复
- [ ] 处理紧急 Bug
- [ ] 回应用户问题
- [ ] 更新文档

### 总结
- [ ] 发布总结文档
- [ ] 记录经验教训
- [ ] 规划下一版本
```

---

## 💡 最佳实践

### 1. 版本号规范

遵循 [Semantic Versioning](https://semver.org/):

```
主版本号。次版本号.修订号
例如：1.1.6

- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正
```

---

### 2. Commit 信息规范

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式
refactor: 重构
perf: 性能优化
test: 测试
chore: 构建/工具
```

---

### 3. Release Notes 规范

```markdown
## [版本号] - 日期

### ✨ 新增
- 新功能 1
- 新功能 2

### 🐛 修复
- 修复 1
- 修复 2

### ⚡ 优化
- 优化 1
- 优化 2

### 📝 文档
- 文档 1
- 文档 2
```

---

## 🎯 检查清单

### 发布前必查

- [ ] README 版本号 ✅
- [ ] README 下载链接 ✅
- [ ] README 功能清单 ✅
- [ ] package.json 版本 ✅
- [ ] CHANGELOG 完整 ✅
- [ ] Release Notes 详细 ✅
- [ ] 构建产物测试 ✅
- [ ] Git Tag 创建 ✅

### 发布后必查

- [ ] GitHub Release 创建 ✅
- [ ] 安装包上传 ✅
- [ ] 下载链接有效 ✅
- [ ] 通知发布 ✅
- [ ] 反馈监控 ✅

---

## 📈 持续改进

每次发布后记录：

1. **做得好的**: 继续保持
2. **待改进的**: 下次优化
3. **学到的**: 经验总结
4. **下一步**: 改进计划

---

**最后更新**: 2026-03-20  
**版本**: v1.1.6  
**状态**: ✅ 发布完成

**确保每次发布都专业、完整！** 🚀
