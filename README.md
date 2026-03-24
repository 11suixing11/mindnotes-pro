# MindNotes Pro

开源、免费、全平台的手写与文字混合笔记应用。

[在线体验](https://11suixing11.github.io/mindnotes-pro/) · [文档中心](docs/README.md) · [问题反馈](https://github.com/11suixing11/mindnotes-pro/issues) · [社区讨论](https://github.com/11suixing11/mindnotes-pro/discussions)

## 项目概览

MindNotes Pro 面向学生、知识工作者与创作者，提供从灵感捕捉到结构化整理的一体化体验。

核心方向：
- 手写与文字无缝切换
- 本地优先与离线可用
- 跨端一致体验（Web、桌面、移动）
- 可持续演进的命令与快捷键体系

## 功能亮点

1. 创作能力
- 手写笔刷、橡皮擦、图形绘制
- 无限画布与图层管理
- 快捷键与命令体系

2. 数据能力
- 本地优先存储
- PWA 离线访问
- 多格式导出（PNG、JSON、SVG、PDF）

3. 工程能力
- TypeScript + React + Vite
- 单元测试与覆盖率门禁
- 可扩展的架构模块（命令中心、协作基础）

## 快速开始

运行环境：Node.js 18+，npm 9+

```bash
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm run test -- --run
npm run test:coverage -- --run
npm run lint
```

## 平台与发布

| 平台 | 说明 |
| --- | --- |
| Web | GitHub Pages 在线访问 |
| Windows / macOS / Linux | Electron 打包发布 |
| Android | Capacitor 构建流程 |

最新版本：1.3.2

发布文档：
- [CHANGELOG.md](CHANGELOG.md)
- [RELEASE_NOTES_v1.3.2.md](RELEASE_NOTES_v1.3.2.md)

## 质量状态

当前基线（本地验证）：
- 构建：通过
- 测试：45/45 通过
- 覆盖率：已达到阈值（行/分支/函数/语句全部通过）
- 生产依赖审计：0 漏洞

## Roadmap

短期（1.3.x）：
- 继续优化分包体积与首屏加载
- 收敛快捷键入口，统一交互路径

中期（1.4.x）：
- 协作能力增强
- 冲突解决体验完善

## 贡献

欢迎提交 Issue 和 Pull Request。

建议流程：
1. Fork 仓库并创建分支
2. 保持构建、测试、lint 通过
3. 提交 PR 并附变更说明与验证结果

## 许可证

MIT，详见 [LICENSE](LICENSE)
