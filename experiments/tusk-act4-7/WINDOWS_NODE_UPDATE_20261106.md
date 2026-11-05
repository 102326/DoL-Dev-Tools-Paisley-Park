# Windows Node 更新：26.13.0 LTS 与兼容检查

2026-11-06（Asia/Shanghai）。**现有系统 Node 已从 26.12.1 更新为 26.13.0 LTS，基础环境和本轮轻量兼容检查通过。** 更新期间旧 MSI 的卸载子过程调用了 Restart Manager，日志记录关闭及重启占用应用；UI 也报告其动态测试提前退出。具体进程关联仍待 UI 原始证据，不能把本次更新描述成对并发任务完全无影响。

结果见 [脱敏摘要](windows-node-update-results.json)。本轮只更新已有系统运行时并记录结果，没有修改开发包代码、Skill、版本、main、Tag 或 Release。

## Delivered

用户选择“直接更新即可”，本轮不再执行旧 26.0 便携包方案。读取两个工作树及远端后确认：专用工作树位于 `d57032987fdb0241faaaf33028d399a03052f91b`，与远端研发分支一致且干净；原 Windows 工作树仍在 `b6833f05b3d9878d6f7aacba40086ed5f29eeb19`，干净、落后两笔，没有覆盖其文件。实际安装与兼容检查使用前者留证。

官方当前稳定目标为 [Node 26.13.0 LTS](https://nodejs.org/en/download)。现有系统安装为 Windows Installer 的 Node.js x64，WinGet 识别为 OpenJS.NodeJS；本机 WinGet 目录暂未提供 26.13.0，因此沿用原 MSI 安装方式，从 Node 官方取得同类型更新包，没有更换版本管理器。

| 核验项 | 本次结果 |
| --- | --- |
| 安装位置 | 仍为 `%ProgramFiles%/nodejs` |
| 官方 MSI | `node-v26.13.0-x64.msi`；SHA-256 `0e5ee99c7cbf922887f04af268e3665990748945336a44956f47cc0df695b6df`，与官方 SHA 清单及发布页一致 |
| 签名 | MSI 与更新后 node.exe 均为 Valid；安装包签名者为 OpenJS Foundation |
| 实际运行身份 | Node `v26.13.0`、LTS `Lithium`、x64、modules ABI 147；默认入口仍为上述目录 |
| 更新后 node.exe SHA-256 | `14319838b3f355e0398c13569a90270bce4fc68f25189f58c59b03dadae0e6d5`，匹配官方发布摘要 |
| npm | 仍为 11.20.0；prefix 与已有配置文件的存在性/摘要保持 |
| 其它已记录入口 | 用户目录的 24.19.0、Codex 主运行时的 24.22.1 文件摘要不变；没有主动替换其它 Node 副本 |
| 组件 | 原有六项 MSI feature 安装状态保持，没有选择额外工具链或新组件 |

摘要、下载地址和版本身份依据 [官方 26.13.0 发布说明](https://nodejs.org/en/blog/release/v26.13.0)。官方说明此版除 LTS 发布元数据外没有超出 26.12.1 的代码变更；本轮仍实际执行了下面的 Windows 检查，没有只引用该说明宣布兼容。

## 实际安装与并发副作用

仅发起了一次真正的 MSI 安装。此前一次目标 Node 短暂占用使本地前置检查停止，安装器没有启动；后续空闲快照和安装记录分别保留。普通 MSI 路径发起后出现实际 Windows 管理员/UAC 提示，用户在系统窗口确认，没有通过聊天提供凭据；没有绕过 UAC、修改安全策略或在脚本指定其它账户。

命令使用原安装目录、`/passive`、`/norestart`、`MSIRESTARTMANAGERCONTROL=Disable` 和本地详细日志。安装器实际退出 **0**，没有再次安装、回滚或主动重启其它任务，也没有发起 Windows 重启。

以下时间均为 2026-11-06 +08:00：

| 时间 | 实际记录 |
| --- | --- |
| 02:20:30 | 普通 MSI 客户端启动。 |
| 02:20:40 | 日志明确需要管理员凭据，并出现 consent 进程；此时尚未取得成功结果。 |
| 02:21:49 | `RemoveExistingProducts` 启动旧版本卸载子流程。 |
| 02:21:50–51 | 子流程 Restart Manager 明确尝试关闭/重启应用，并记录成功关闭占用应用。 |
| 02:22:04 | 安装完成、返回 0；日志记录此前关闭的应用已重启。 |

**顶层 Disable 参数没有覆盖整条嵌套卸载链。** 原始 invocation/result JSON 中的 `automaticAppShutdownDisabled: true` 只记录传入参数的意图，不代表整链实际行为；后续行为核对记录与本报告保留这一差别。不能因没有手动执行 kill，就否认安装器记录的关闭/重启副作用。

只读关联发现 MSI 列出 41 个 Node 候选 PID；随后检查有 40 个仍以原 PID 存活，路径属于 Codex 内置运行时，另一个已不在当前进程表。该结果不能单独证明消失 PID 的退出原因，也不能否定 UI 测试受到影响。协调方已收到 UI 提前退出报告，UI 的具体 PID、原始错误与退出时间尚待关联。指定窗口的 Application 事件查询未取得匹配记录，原 MSI 日志完整保留，没有因此升级系统权限。

本轮占用判断只过滤目标可执行路径，不足以覆盖 MSI 的全部进程处理。这是需要保留的流程缺口：后续系统 Node 更新先协调所有相关动态任务停稳，包括使用嵌入式 Node 的任务，不能只依赖瞬时系统 Node 进程数或顶层参数。`/norestart` 也不代表禁止应用进程关闭。

## Validated

PATH 文本不完全相同，已按同一读取方式逐项核对，没有盲目恢复：

- Machine PATH 仍为 22 项，原 Node 条目移至末尾；其它非空条目及其顺序完全相同。
- User PATH 24 → 23 项，原 npm 条目移至末尾，移除一个空项；其它非空条目及其顺序完全相同，旧用户 Node 入口保留。
- 没有新增或删除其它有效路径，也没有手工写入 PATH、npm 配置或安全策略。

新进程使用绝对系统 Node 入口，实际确认 `v26.13.0` 后执行：

| 检查 | 本轮 Windows 结果 |
| --- | --- |
| 固定独立包 CJS / resolver | `--no-strip-types` 下 version 与 resolver 成功，实际工具版本仍为 6.1.0；未替换工具包 |
| XState | 包内解析到锁定的 5.33.2，实际 actor 完成并停止 |
| SQLite | 本轮全新中性数据库完成事务、关闭重开及 integrity_check；没有打开历史 Store |
| Program 一致性 | 98 Node、17 DOM-only、133 产物匹配 |
| 串行定向兼容 | 固定包 `game-goal.test.cjs`、`runtime-clone-boundary.test.cjs`、`cli-errors.test.cjs`：68 通过、0 失败/跳过 |

独立包仍来自 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`，ZIP SHA-256 为 `62b95509df39b010602235922a275d32109000b53a1423bc1b34a599bf39a8da`。定向测试是本轮 Node 下的隔离 coordinator/输入边界夹具，含其原本的 mock/Outcome hook，**不是新增真实 DoL 或真机通过**。测试 runner 使用实际 26.13.0 绝对入口，原 CLI fixture 子进程使用 `process.execPath`；没有拿 26.12.1 或 Mac 结果替代本轮结果。

没有重跑刚完成的 G6、真实保存/恢复、导航、完整 Node/Python 或 Chrome 套件，没有操作 Android、用户 Profile、旧 Store 或 Unknown。基础环境 smoke 通过后已说明 UI 可恢复自己的新测试，不需要等待开发包大套件；其原失败现场和绑定有效性仍由 UI 核对。

## Not validated / Known limitations

**Windows 最低 Node 26.0.0 仍未验证。** 用户选择更新高版本不补足这条证据，本轮没有安装旧版、调整 engines 或伪改最低支持声明。当前更新后的代表性兼容完成，不等于全平台覆盖或 UI 业务验收完成。

MSI 并发副作用是真实记录；具体 UI 进程关联仍不确定。历史 F07 / 后台截图根因仍 Unknown。没有为消除这些不确定性重启任务、重新安装、自动回滚 PATH 或扩大测试矩阵。

MSI/consent 客户端已退出，测试用 SQLite 已关闭、actor 已停止，定向测试结束。官方 MSI、安装日志、配置/路径快照和进程关联记录仅保留于专用工作树忽略的 `artifacts/node-update-20261106/`，不上传。该目录也保留安装源文件供后续维护，不自动删除；不结束系统 Installer 服务或其它任务进程。

后续只剩单列的最低运行时输入、实机接续和真实历史输入条件。Android 空闲授权保留，但 UI 当前窗口优先，本轮没有进入设备阶段。其余覆盖不自动成为本次更新阻断；同步仅限原研发分支，不合并 main、不改版本/Tag、不发布。
