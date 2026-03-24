# Release Push Checklist v1.3.2

## 本次建议纳入发布的文件

- README.md
- public/index.html
- CHANGELOG.md
- RELEASE_NOTES_v1.3.2.md
- package.json
- package-lock.json

## 发布前验证（已通过）

- npm run lint
- npm run test -- --run
- npm run test:coverage -- --run
- npm run build

## 推荐推送流程（仅提交本次发布相关文件）

```bash
git add README.md public/index.html CHANGELOG.md RELEASE_NOTES_v1.3.2.md package.json package-lock.json

git commit -m "release: v1.3.2 homepage refresh and release prep"

git tag -a v1.3.2 -m "MindNotes Pro v1.3.2"

git push origin main

git push origin v1.3.2
```

## 发布页建议内容

- 标题: MindNotes Pro v1.3.2
- 核心更新:
  - 项目主页重写（README + public/index）
  - 覆盖率与测试门禁稳定通过
  - jspdf 安全修复，生产依赖审计为 0 漏洞
- 附件说明:
  - Web 版使用 GitHub Pages
  - 桌面与移动包按现有打包流程生成

## 注意事项

- 当前工作区存在较多历史改动，建议只 add 上述 6 个文件发布本版本。
- 若需包含近期测试与安全修复代码，请先单独审阅并分批提交。
