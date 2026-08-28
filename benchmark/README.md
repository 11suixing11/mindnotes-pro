# MindNotes Pro 性能基准

性能基准使用固定的 **100、1,000、5,000 个元素**数据集，元素分布和内容由
`src/benchmark/performanceBenchmark.ts` 确定性生成。不要用线上画板数据作为基线：本地优先数据可能包含隐私内容，且不同数据集无法比较。

## 运行

```bash
npm run benchmark
```

命令通过 Vite 加载源码并输出 JSON。也可以把结果写入文件：

```bash
npm run benchmark -- benchmark/results/latest.json
```

用一份同类基线执行 20% 回归门禁：

```bash
npm run benchmark:compare -- benchmark/results/baseline.json benchmark/results/latest.json
```

任一可比较关键指标相对基线增加超过 20% 时，命令以非零状态退出；缺失或格式错误的指标也会阻断门禁。
两侧都明确标记为不可用的指标（例如无头模式下 PNG/PDF 的 `null`）会标记为 `skipped`，不会伪造耗时或误报回归。
基线和当前结果必须来自同一运行器（`benchmark` 或 `benchmark:browser`）、同一数据规模和尽量相同的机器环境。

每次比较都应记录 Node、平台、提交 SHA、浏览器版本（若运行浏览器导出基准）以及是否为空闲机器。

## 指标

| 字段                                   | 含义                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `firstRenderMs`                        | 无头渲染准备：图层排序和元素 bounds 遍历。它不是 Canvas paint 时间。                                                                    |
| `dragZoomMs`                           | 一组平移和锚点缩放变换的平均耗时。                                                                                                      |
| `hitTestIndexedMs` / `hitTestLinearMs` | 空间索引候选查询与线性命中测试的平均耗时。`hitTestMatches` 必须为 `true`。                                                              |
| `autosaveMs`                           | 无头模式是 IndexedDB 写入前对文档快照做 structured clone 的基线耗时；浏览器模式是在隔离临时 IndexedDB 中完成真实 `put` 事务的平均耗时。 |
| `backupJsonMs` / `backupBytes`         | 完整 JSON 备份规范化和序列化成本。                                                                                                      |
| `svgMs` / `svgBytes`                   | SVG 导出字符串生成成本。                                                                                                                |
| `pngMs` / `pdfMs`                      | 无头运行时固定为 `null`。                                                                                                               |

### PNG/PDF

jsdom 不实现 Canvas 编码，使用它测 PNG/PDF 会得到虚假结果。因此源码提供
`runBrowserExportBenchmark(fixture)`，应在真实 Chromium/Firefox 页面中调用，并记录返回的
`renderMs`、`pngMs`、`pdfMs`、字节数。发布前的冒烟测试应至少在 Chromium 运行一次；浏览器、GPU、DPR
和字体差异必须作为环境元数据保存，不能和无头 JSON 数值直接混合比较。

本仓库提供 Playwright Chromium 入口，可直接运行完整三组浏览器导出基准：

```bash
npm run benchmark:browser
npm run benchmark:browser -- benchmark/results/chromium.json
```

该入口使用 Vite 临时服务器和独立的 `benchmark/browser.html`，不会打开或修改应用的 IndexedDB。
每个规模的浏览器基准还会创建随机临时数据库，完成多次 `docs.put`，随后关闭连接并调用
`indexedDB.deleteDatabase()` 清理；运行结束会用 `indexedDB.databases()` 校验没有
`mindnotes-pro-performance-*` 残留。清理被阻塞、失败或无法验证时命令会失败，不会留下“成功”结果。

## 回归门槛

以同一机器、同一提交基线为准，重构后关键路径（渲染准备、拖动/缩放、命中、自动保存、导出）任一项
超过 **20%** 回归时，先分析数据结构和缓存变化，再决定是否继续架构拆分。性能基准用于发现回归，
不把绝对毫秒数当作跨机器 SLA。
