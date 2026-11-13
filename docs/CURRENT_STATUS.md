# 当前版本与验证范围

当前维护源码和本地候选为 **7.1.0-rc.2**。正式公开版仍为 [7.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v7.0.0)；本页不表示 7.1 已发布，也不改变正式 7.0 制品。

## 7.1 改了什么

- 同步官方 Android CLI 与 Skills 的使用指引，按问题选择原生 input、profiler、device hub、ADB 或 CDP；工具和本机依赖不随 ZIP 分发，见[工具链指南](TOOLCHAIN.md)。
- 通过 Windows 小规模情境评测核对 Skill 的判断。没有证明试验长稿更好，主 Skill 未采用长稿；细化经验放进已有[开发 Recipe](DEVELOPMENT_FLOW.md)。本次只修必要文档引用，不增加一套行为规则。
- 分开当前说明、仍有效的兼容/验证参考和历史交付记录；当前包按自身版本验货，旧候选保留原来源与摘要。

PC Chrome、通用诊断、源码查询、GER 与 Optional Integration 的行为合同继续沿用。Node 仍要求 26.0.0+，XState 仍锁定 5.33.2，SQLite 由 Node 提供。

## 哪些结果可以复用

| 证据 | 适用范围 |
| --- | --- |
| 7.0 代表性宿主/业务结果 | 保留在[7.0验证基线](CLOSEOUT_7_0.md)，按原输入与场景复用，不计作 7.1 新增真机结果。 |
| 7.1 RC.1 最终离线及隔离包验货 | 来源 `8028efa5aee043c965ed9f9a761367726e5aa41f`；完整 Node 665 通过/2 跳过、Python 9 通过/1 跳过及候选关键路径。RC.2 文档维护不把这些数字写成一次新的全量运行。 |
| Windows Skill Intelligence | 12 题判断、A/B 与 Judge 已运行；未证明长稿提升。评分修订仍待人工复核。详细[源码实验记录](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/d85b7e275881b8c78ce66432b4e988511f748655/experiments/skill-intelligence-7.1/RESULTS.md)不随包分发。 |
| 本次候选安装与内容 | 以此包随附的 manifest、文件清单和 validation.json 为准；旧 ZIP 的摘要或安装结果不替代新 ZIP 验货。 |

## 当前限制

子 Codex 的真实工具探针在启动 resolver 之前返回 `registered Core launch requires an installed app`，source-find 未执行。对话结束不代表工具通过；本轮没有调整宿主权限或重试绕过。这个记录不等于本地 CLI、安装器或源码查询本身失败。

本轮未新增 Android/WebView、正式游戏/存档、最低 Windows Node 26.0、Mac/Linux 或全局 Skill 热重载验证。历史 Store 缺失和 Unknown 未由升级恢复。只有实际范围内的新风险或明确任务要求才扩展验证，不把这些项目自动变成产品未完成。

## 如何阅读旧文档

- 日常命令、安装和 Recipe 以当前指南为入口。
- [4.0 兼容约束](CLOSEOUT_4_0.md)、[Windows 安装器参考](WINDOWS_5_1.md)、[6.1 平台验证参考](WINDOWS_6_1.md)及[既有经验导航](PAISLEY_PARK_5_0_C_FOLLOWUP.md)仍有具体用途，但其中的路径、授权、版本和测试次数属于各自历史场景。
- 旧交付进展及冗余收口记录只从[历史索引](HISTORY.md)访问固定源码，不作为当前安装步骤。旧版本文档与旧 Skill 是不同对象，包内 Skill 的身份以实际文件和安装 manifest 为准。
