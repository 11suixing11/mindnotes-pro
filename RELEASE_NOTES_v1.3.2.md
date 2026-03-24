# Release Notes v1.3.2

发布日期: 2026-03-24
版本类型: Patch

## 重点更新

1. 项目主页重写
- README 主页信息重构，突出功能、质量状态与发布准备度
- public/index.html 重建为统一品牌入口，并指向主应用页面

2. 质量门禁提升
- 测试总数提升到 45 项并全部通过
- 覆盖率达到并超过阈值门禁
  - Statements: 86.7%
  - Branches: 75%
  - Functions: 88.88%
  - Lines: 87.42%

3. 依赖安全修复
- jspdf 升级到 4.2.1
- 生产依赖审计结果为 0 漏洞

## 发布前校验结果

- lint: 通过
- test: 45/45 通过
- coverage: 通过阈值
- build: 通过
- npm audit --omit=dev: 0 vulnerabilities

## 影响范围

- 文档与主页入口
  - README.md
  - public/index.html
- 质量与测试
  - src/hooks/useServiceWorker.ts
  - src/hooks/useServiceWorker.test.ts
  - src/store/useAppStore.test.ts
- 依赖
  - package.json
  - package-lock.json

## 升级建议

- 生产环境可直接从 v1.3.1 升级到 v1.3.2
- 若自定义导出流程依赖 jsPDF 旧行为，请做一次 PDF 导出回归测试

## 已知注意事项

- 构建仍提示 vendor-tldraw 大包告警，建议在后续小版本继续做分包与懒加载优化
