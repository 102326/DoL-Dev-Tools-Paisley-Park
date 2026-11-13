# 当前版本与验证范围

本源码对应 **7.2.0 — Gold Experience**，收口自 7.1 维护分支。下载与正式发布状态见 [v7.2.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v7.2.0)，来源提交与 ZIP 内容以随附 manifest 和 SHA-256 为准。7.0 资产及 7.1 各轮原始版本、失败和记录保留，不追改为 7.2 实测。

## 7.2 改了什么

- Android 工具指南补齐原生 input、profiler、device hub 与 ADB/CDP 的选路。本机维护阶段选择性同步官方 CLI/Skills，不要求使用者追逐所有最新版，工具和 SDK 不随 ZIP 分发。
- 安装解析器支持新的英文显示名，兼容旧名称；发布包只有一份项目 Skill。旧公告、过程实验和多余收口记录留在源码历史，必要兼容说明仍保留。
- 已有开发 Recipe 补充有效授权接续、变化项核对和自有可重建产物的清理责任。普通启动/只读诊断按具体风险处理；完整备份不是所有普通启动的一概门槛，清数据和存档写入仍需对应范围与恢复条件。

PC Chrome、通用诊断、源码查询、GER 与 Optional Integration 的合同继续沿用；没有重构 Runtime 或改变历史 Unknown 语义。Node 要求 26.0.0+，XState 锁定 5.33.2，SQLite 由 Node 提供。

## 证据来自哪里

| 证据 | 实际范围与来源 |
| --- | --- |
| 正式包验货 | 对最终固定提交重新核对实际 ZIP、版本、导出文件/字节、依赖隔离、安装/resolver 和自有 SQLite；项目 CI 按对应提交核验。原始输出留本地，正式附件只提供包、摘要和来源清单。 |
| Windows 工具链 | Node 26.13.0；官方 CLI 更新至 1.1.16919734，ADB 37.0.1-15733141。版本/help/KB 与实际设备操作分别记录，不因更新就宣称所有能力通过。 |
| 7.1 RC 历史离线结果 | 来源 `8028efa5aee043c965ed9f9a761367726e5aa41f`；完整 Node 665 通过/2 跳过、Python 9 通过/1 跳过。RC.1、RC.2 包及其原摘要保留，历史结果不改称最终 7.2 新运行。 |
| 文本情境对照 | 初轮 12 题与后续五类隔离判断分开。正式 7.0 对当前 7.1 的后续对照未证明候选更好；未采用长稿，没有改分追分。两项新标签争议及旧四项人工复核仍未结案，不等同真实工具行为。 |
| 真实文件副本生命周期 | 从原 Workshop 三个合成源文件构建、修改、精确清理、恢复；首次 Node 路径选择失败保留，修复后实际完成。不等同 Android App 重建或 Agent 版本 A/B。 |
| 真实 Android | 指定测试平板 Android 17 / user 0，Doctor 实际核对；现有测试 App 完成生产 frame/loader/uniqueContext 绑定、被动 DOM/样式与公开环境读取。App 由用户打开，Agent 启动派发为 0；无重载、App 重建、存档/Mod 写入。自有连接和 forward 清理完成。 |
| 7.0 既有宿主/业务 | [7.0 验证基线](CLOSEOUT_7_0.md)按原输入复用，不计作 7.2 新增真机业务结果。 |

7.1 的固定输入、失败与细分结果在[源码交接](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/3532f9d4de8be7564c60742961dfa3be93f2cefb/docs/handoff/7.1-windows)和[源码实验记录](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/3532f9d4de8be7564c60742961dfa3be93f2cefb/experiments/skill-intelligence-7.1)保留，不随 ZIP 分发。它们说明各轮实际输入，不代表对所有项目和设备的保证。

## 当前限制

本轮没有新增 Mac/Linux、最低 Windows Node 26.0、Android CLI 输入/截图/性能采集或全局 Skill 热重载验证。安装/resolver 通过只说明位置与文件完整，宿主仍需发现正确 Skill。

子 Codex 工具探针仍在启动 resolver 之前受阻：`registered Core launch requires an installed app`。source-find 未执行，也未重试或调整宿主权限；普通父入口和生产 CDP 成功不能替代该接缝的验证。这不是本地 CLI 或源码查询本身失败的证明。

历史 Store 缺失及原目标未决事实未由升级恢复。不要换 Store、数据副本或新合同结清旧 Unknown；独立源码与无冲突只读工作仍可继续。没有“完整自主 Android Mod 修复”或统计意义的智能提升结论。

## 如何阅读旧文档

日常命令、安装和 Recipe 以当前指南为入口。[4.0 兼容约束](CLOSEOUT_4_0.md)、[Windows 安装器参考](WINDOWS_5_1.md)、[6.1 平台参考](WINDOWS_6_1.md)及[既有经验导航](PAISLEY_PARK_5_0_C_FOLLOWUP.md)仍有具体用途，其中版本、路径和测试次数属于原场景。旧公告和流水从[历史索引](HISTORY.md)访问，不作为当前安装步骤。保留旧文档不等于包内存在多份旧 Skill。
