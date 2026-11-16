# MindNotes Pro 生产验收

当前开发版本为 `6.0.0-beta.12`，Windows x64。产品入口为悬浮屏幕批注与随页定位的网页笔记，两类笔记共享本地库。**当前尚未达到正式生产交付标准。**

beta.12 修复实际 beta.11 程序复现的两处问题：网页导入在写入失败时仍提示成功，以及从旧副本恢复时未提醒最近修改可能缺失。导入回执现在等待落盘与同时到达的编辑；失败时保留内存笔记并支持恢复导出。旧副本恢复提醒在本次使用中持续显示，存储错误与操作回执分别保留。

## 当前源码证据

| 检查 | 已有结果 | 保留记录 |
| --- | --- | --- |
| 完整源码检查 | 本次重新执行：139 文件、1,283 单元及 16 真实存储检查通过；0 errors、63 既有 warnings，类型、依赖边界与构建通过 | [完整日志](tmp/beta12-acceptance/logs/check-01.log) |
| 网页回归 | 当前生产资产的网站、兼容白板与注入层共 58 项通过 | [网页日志](tmp/beta12-acceptance/logs/web-01.log) |
| 保存与恢复反馈 | 4 项组件检查通过 | [组件日志](tmp/qa/logs/tmp-page-feedback-beta12-components.log) |
| 持久化与恢复 | 16 项真实存储检查通过，包含失败导入、重试、并发编辑、旧副本提醒与原文件保留 | [存储日志](tmp/qa/logs/tmp-page-feedback-beta12-storage.log) |

本次修正验收工具的两处路径问题：源码清单单独记录已删除的 Git 文件；桌面截图使用每项测试的输出目录。工具 lint 与 E2E 类型检查通过，桌面测试清单为 34 项。原有源码与组件日志继续保留。完整检查之后恢复 production 前端资产，并与包内 58 个文件再次逐字节核对通过；未更换已验收的 exe 或 app.asar。

## 当前实际包检查

2026-11-12 从主仓库完成 Windows x64 Setup 与 Portable 构建。应用版本为 beta.12，Electron 43.8.8、electron-builder 26.18.1。

| 检查 | 已有结果 | 保留记录 |
| --- | --- | --- |
| Windows 构建 | Setup、Portable 与 win-unpacked 已生成，无发布操作 | [构建日志](tmp/beta12-acceptance/logs/build-windows-01.log) |
| 发行文件校验 | 58 个生产资产、15 个运行依赖、生产版本字段及两个分发包内 exe／asar 均一致；SHA256 已记录 | [资产清单](tmp/beta12-acceptance/artifacts-03/artifact-manifest.json) · [源码清单](tmp/beta12-acceptance/artifacts-03/source-manifest.json) |
| 隐藏实际 exe 集成 | 8 阶段通过，包含生成的千笔恢复、权限拒绝、损坏导入回滚、编辑导出与两次重启；3 个进程正常退出 | [报告](tmp/qa/hidden-executable-beta12.json) · [日志](tmp/beta12-acceptance/logs/hidden-executable-01.log) |
| 隐藏存储故障与恢复 | 8 阶段通过，包含损坏／未来 SQLite、旧副本持续提醒、失败导入诚实回执、原件保留及备份精确恢复；11 个进程正常退出，无产品缺陷 | [报告](tmp/beta12-acceptance/hidden-storage-faults-02.json) · [日志](tmp/beta12-acceptance/logs/hidden-storage-faults-02.log) |
| 隐藏异常恢复 | 10 阶段通过，包含页面／笔记窗口崩溃、有限自动重载、继续编辑、单实例、批注层输入释放、工具条崩溃退出与精确重启；4 个进程正常退出 | [报告](tmp/beta12-acceptance/hidden-crash-01.json) · [日志](tmp/beta12-acceptance/logs/hidden-crash-01.log) |
| 屏幕笔记性能基准 | 生成的 1,000 笔／160,000 点：擦除判定 21.5 ms、最大草稿保存 166.8 ms；1,000 条生成笔记检索 1.3 ms；大备份流式导入 3.24 s | [基准日志](tmp/beta12-acceptance/logs/screen-performance-01.log) |

隐藏检查均在窗口创建前禁止 show／focus，数据与临时文件位于工作区。生成笔迹、PNG、程序化 IPC 和隐藏页面状态不能证明可见合成、真实截图、持续输入或物理笔延迟。性能基准读取当前编译模块，属于生成数据的单次算法／存储测量，没有宣称原生书写性能通过。用户选择先完成不占用桌面的检查，因此本次未执行可见桌面、真实安装或实笔流程。

存储故障检查首次启动因准备脚本仍引用已移除的候选清单而退出，未启动应用；[原始日志](tmp/beta12-acceptance/logs/hidden-storage-faults-01.log)保留。将工作区内的任务脚本指向本次资产清单后完整复跑通过，原准备脚本未改写。历史异常恢复脚本同样在任务目录适配 beta.12 版本和确切 hashes 后执行，未覆盖 beta.11 证据。

## 发行文件与历史证据

主源码仅维护本仓库，发行包位于 `release/`。beta.12 使用同一源码和依赖构建，未复制整套仓库。当前本地候选为下列 beta.12 包，仍未正式发布或生产合格。

beta.11 包保留在 `release/beta11-candidate/release/`，供复现和比较使用。它因上述保存／恢复反馈问题退出当前候选；其历史检查不能替代 beta.12 验收。

| 文件 | 保留位置 |
| --- | --- |
| beta.12 Setup | [安装版](release/MindNotes-Pro-6.0.0-beta.12-Setup-x64.exe) |
| beta.12 Portable | [免安装版](release/MindNotes-Pro-6.0.0-beta.12-Portable-x64.exe) |
| beta.12 SHA256 与候选说明 | [校验值](release/SHA256SUMS-beta12.txt) · [候选说明](release/beta12-使用与验收说明.md) |
| beta.11 Setup | [安装版](release/beta11-candidate/release/MindNotes-Pro-6.0.0-beta.11-Setup-x64.exe) |
| beta.11 Portable | [免安装版](release/beta11-candidate/release/MindNotes-Pro-6.0.0-beta.11-Portable-x64.exe) |
| beta.11 构建源码 | [源码快照](release/beta11-candidate/build-source-beta11.zip) |
| beta.11 原包与证据关联 | [版本关联](tmp/qa/beta11-candidate/candidate-association.json) |
| beta.11 存储缺陷 | [实际包诊断](tmp/qa/hidden-storage-faults-beta11.json) · [退出候选记录](tmp/qa/beta11-storage-fault-superseded.json) |
| beta.11 异常恢复 | [10 阶段记录](tmp/qa/hidden-crash-beta11-final.json) · [日志](tmp/qa/logs/tmp-hidden-crash-beta11-final.log) |
| beta.2 Setup | [升级测试基线](release/MindNotes-Pro-6.0.0-beta.2-Setup-x64.exe) |

beta.11 及更早的报告、日志、截图和原始说明合并到 [历史验收归档](tmp/qa/history/acceptance-through-beta11.zip)。归档保持原文件字节和相对路径；历史路径、测试准备、等待状态及通过数量描述当时环境。目前没有运行中的旧测试实例。旧版重复发行包和构建目录已清理，beta.2 Setup 因安装升级测试仍需使用而保留。

历史 beta.6 有 Windows 11 可见桌面、真实截图、混合 DPI 双屏、普通全屏、公开文章及发行生命周期记录；后续发现的指针和恢复缺陷同样保留。历史 beta.11 有隐藏恢复、权限、指针、笔记库及长错误检查。这些记录各自限于其版本，不能作为当前候选通过。

## 待完成的同包验收

1. 在协调桌面输入后，对已生成的实际 beta.12 程序运行 34 项可见桌面流程，包括新增的旧副本提醒与失败导入恢复。
2. 验证公开文章、两屏普通全屏、真实截图、Portable 实际自解压启动及安装／升级／卸载恢复。
3. 完成 1,000 笔、15 分钟闲置与重启恢复，以及高漫实笔、触控、Windows 10、锁屏／睡眠／拔屏和持续使用检查。
4. 完成可见布局及独立首次使用验收。发布者签名尚无证书，按用户此前要求延期，先完成其余验收。

执行方法见 [发行包验收步骤](e2e/acceptance/README_CN.md)。隐藏 DOM／CDP、生成笔迹和 PNG 不证明可见桌面合成、物理笔输入或真实截图。

用户真实笔记继续使用 `%APPDATA%/mindnotes-pro` 等软件原有数据目录；本次测试使用工作区内隔离目录。升级前导出两类 JSON，卸载保留数据。当前源码未提交，本次完成本地构建与上述检查，没有推送、部署或发布发行版。
