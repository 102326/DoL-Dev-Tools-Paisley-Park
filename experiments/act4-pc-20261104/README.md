# 历史：3.0.3 ACT4 PC 复现（已废弃）

此目录是 2026-11-04 的历史实验，不是 Gold Experience 7.0 的运行、安装或验收入口。当前 PC 能力见 [PC Runtime](../../docs/PC_RUNTIME.md)，当前支持范围见 [7.0 收口](../../docs/CLOSEOUT_7_0.md)。

旧实验以独立的 3.0.3 ACT4 代码 `52a8893910c57ed420587c137472ffb008567b18` 为输入。这里的 `verify.cjs` / `bind-owned.cjs` 仍通过显式 `HISTORY_ROOT` 加载那份旧代码；夹具和 helper 本身没有携带完整旧 Runtime。当前 7.0 代码或当前安装的 Skill 不能直接代替该历史依赖。

原操作说明和结果原文保留在正式仓库的固定 [历史 README](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/8c5628fc2bd93cf6116e5cef3fe597315a2525f1/experiments/act4-pc-20261104/README.md)、[历史报告](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/8c5628fc2bd93cf6116e5cef3fe597315a2525f1/experiments/act4-pc-20261104/REPORT.md)。这些链接属于保留的正式仓库，不依赖将退役的旧私有远端。

历史复现须单独审查匹配的原代码与环境；不得注册旧 Skill、连接当前 Store 或默认执行旧依赖安装。缺少原输入时说明不可复现，不换成当前实现凑结果。

`results.json` 与原中性夹具/helper 保留原样；它们是历史结果，不追认为当前平台通过。本目录通过 `export-ignore` 完整排除在发行包之外。整理范围与核验结论见[公开摘要](../../docs/handoff/legacy-act4-retirement-20261110/REVIEW.md)。本轮没有执行旧代码、删除或归档旧仓库。
