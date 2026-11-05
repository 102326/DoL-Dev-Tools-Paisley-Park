# Windows 独立包：原生导航与保存 Scope

2026-11-06（Asia/Shanghai）。**本轮代表闭环通过。** 窄 Scope 请求在原生派发前拒绝；随后依据已有任务授权另建 navigation/save 请求，由生产 GER 完成一次 Start2 → Orphanage Intro 导航。原 terminal 与独立状态一致，没有未决 Effect。

脱敏结果见 [验证摘要](windows-package-native-navigation-results.json)。本轮无生产代码修复，不占用 Android 或可见桌面。

## Delivered

编排工作树固定 HEAD 为 `595eaa7e095b957852149db4b96744ecd8af5873`。实际工具是源码树外的既有固定独立包，代码来自 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`，与当前生产代码一致。

| 输入 | 本次身份 |
| --- | --- |
| ZIP SHA-256 | `62b95509df39b010602235922a275d32109000b53a1423bc1b34a599bf39a8da` |
| 包核验 | [431 文件清单](windows-package-manifest.json)全部匹配，无额外非依赖文件；实验后仍全部匹配 |
| 入口与依赖 | 包内 CJS；Node 26.12.1，`--no-strip-types`；实际包内 XState 5.33.2；CLI/包版本仍为 6.1.0 |
| 宿主 | Windows，PowerShell 7.6.5，Chrome 156.0.8078.80，headless |
| 实际游戏 | 获准 Lyra 合集 HTML，DoL 0.5.12.13 / SugarCube 2.36.1+34 |
| HTML SHA-256 | `0e804505ee6829170936922efce86669387ea17522cd1a3c89c9058edde4e6f8` |

另建空白 Profile、未复用的 loopback origin、SQLite 和 Evidence。只提供 HTML 快照，不托管整个目录。没有复制用户存档、访问此前实验的 Profile / Store、清除 pending 或重解释旧 Unknown。

通过包内标准 Debug Action 准备新游戏，停在 Start2；三个准备点击单独记录，不计作 GER 业务导航。首次只读观察尚未就绪，后续确认版本、控件和原生状态后才操作。原生目标链接唯一，接收 Passage 原文摘要匹配包内已审 profile；存档元数据为空，slot 0 不存在，页面回执 namespace 尚不存在。

## Validated

### 缺少 save Scope 的实际拒绝

当前 `autosaveDisabled` 为 false。直接比较包内原生环境 flags 合同：不允许保存时不匹配；允许保存时匹配。没有更改游戏开关、函数指纹或 attestation 来制造通过。

第一个请求的 Scope 仅含 `navigation`。使用生产 `game-goal-start`、当前完整 Decision envelope、`propose` 和 `dispatch` 入口。此处调用了 CLI dispatch，**没有派发原生业务调用**，证据为：

- 被动 CDP 记录中，包含生产 Action 的 `markOperationDispatch` 包装函数的调用次数为 0；没有捕获到原业务 terminal。
- 原 passage、DOM passage、money、time、turns、history、存档元数据、slot 0 和页面回执状态与执行前一致。
- 生产 semantic 为 `unsupported / not-dispatched / optional-mapping-unavailable`。它没有返回专门的权限错误码；结合 flags 的实际比较与随后同现场的正例确认拒绝边界，不把泛化 reason 当成详细根因日志。
- 原 Effect 为 `settled / not-occurred`，source 为 `coordinator: reservation never crossed dispatch boundary`，没有 execution binding，spent/reserved 均为 0，pending 为 false。

GER 记录的尝试计数为 **1**，不能把它当成一次实际导航，也不能为了写“零派发”改成 0。确认没有未决后，通过生产 `cancel` 结束该 Session，保留原请求、Decision、报价、Effect 和拒绝记录。

### 已有授权范围内的一次导航

同一新 Profile / origin / Store 中，另建含 `navigation` 和 `save` 的请求。它有新的 Session / Request 身份，旧 Scope 仍为 navigation-only。初始状态未变化，目标谓词仍为 false；使用新 Decision 全部字段重新提案，没有修改旧提案或 terminal。相同原控件在相同 epoch 下可产生相同 actionRef，不能省略完整 envelope 的身份核对。

第二个请求只进行一次生产 dispatch。被动记录没有修改调用参数、返回值或页面，只记录方法、函数摘要和原 terminal；实际受保护业务包装函数调用为 1 次，载入的应用/依赖模块均来自独立包，额外文件只有本轮本地观察脚本。

结果为 `Completed`，该 Session 动作数 1，spent 0、reserved 0、pending 为 false。原 binding 为 native-dol / `native-passage-save-1d8f8a292c5c`，attempt、contextNonce、requestDigest 与捕获的原 terminal 一致，SQLite 保存的 evidence 与原 terminal 完全一致。没有普通点击补记业务，也没有 `readOutcome` override。

独立读回确认：Start2 → Orphanage Intro，DOM 与原生 Passage 一致；turns 2 → 3，history 2 → 3，只有一个新 moment；五个 Passage 阶段和五个 addon 阶段结算，money 500、time 0 保持。Goal 初始未满足，由真实导航后原状态完成。

**本次实际自动保存计数为 0，transactions 为 0。** 保存观察器的 committed/readBack 为 true，独立读回仍无存档元数据和 slot 0。本轮证明保存 Scope 及零写入观察边界，不能写成“导航确实触发了一次自动保存”。已有真实手动保存及中断恢复分别见 [源码保存](WINDOWS_TS_REAL_SAVE_20261106.md)和[独立包恢复](WINDOWS_PACKAGE_REAL_SAVE_RECOVERY_20261106.md)。

新 Store 最终共两个 settled Effect：窄请求一个 not-occurred，授权请求一个 occurred。两者 Session、Scope 和结果分别保留；旧拒绝记录未被正例追认。

### 现场、核对脚本与清理

三次准备动作和最终只读采集均取得 DOM、CSS、截图及连接窗口事件；原 frameId、loaderId、uniqueContextId、URL 和 Profile 身份一致。本次截图没有失败，也没有因证据采集重派导航。

只读核对脚本首次误以为 `outcomeContext` 返回整个 Store 的 Effect，实际只返回当前 Session，触发 1 对 2 的断言错误。随后按两个 Session 分别读取，再以只读 SQL 核对 Store 总数为两个 settled；错误留档，没有重做导航或改写业务结果。

own Chrome / HTTP stop 返回后，原 Chrome PID 不再存活，HTTP/CDP 端口无 LISTENING。Profile、Store 和原始证据留在本地忽略的 `artifacts/windows-package-native-navigation-20261106/`，不上传游戏、截图、SQLite 或私人路径。

## Not validated / Known limitations

仅验证固定 HTML 和当前已审导航 profile，不外推为通用剧情、所有 Mod 或所有页面。HTML 没有完整图片等资源，不是视觉验收。本轮没有实际自动保存事务、文档重建、中断恢复或 Android；先前各批结果保留其原范围。

历史 F07、后台截图以及上一批短暂 PID 0 监听的物理原因仍 Unknown。本次成功不证明这些根因已修。没有修改生产代码，未重跑无关本地完整套件。

## 剩余验收清单

本轮范围无剩余阻断。以下清单用于 7.0 后续收口，不自动扩成本轮任务：

| 类别 | 具体项目与边界 |
| --- | --- |
| 可无设备完成的既定检查 | W1 的生成器发布目标真实 Windows 句柄占用/rename：当前 G5 已证明协作锁和故障注入回滚，不能替代真实 OS 共享锁。可在独立临时目录做一项定向验证，保留旧 CJS / peer 数据；不必再跑整个游戏矩阵。 |
| 可无设备、缺对应运行时输入 | Windows 最低 Node 26.0.0 尚未运行，本机现有为 26.12.1；若正式支持声明保持这一最低版本，应准备可验证的对应运行时后验收固定包。Mac 最低版本结果不替代 Windows；本轮不下载安装。 |
| 需要实机窗口 | W4 当前 TS 的代表性真实文档替换、旧 holder 拒绝、Action/GER 原回执和原生资源代次接缝。现有 TS Android 结果仅覆盖只读、上下文约束、关闭及显式新连接；UI P1 优先，不抢设备，不要求遍历全部游戏业务。 |
| 需要真实历史输入，条件性验证 | 原 CRLF 回执、旧停止/过期 Session 与原合同历史；精确 0.5.12.13 源码对照也需对应输入。现有旧版本源码仍标候选，旧 Unknown 原样保留。没有输入不伪造；只有实际兼容/发布要求才提升为阻断。 |
| 额外覆盖 | 导航同时产生非零自动保存、其它业务/Mod/设备组合、复杂视觉场景和设备代理性能研究。当前结果没有承诺这些；Kotlin 原型的采用本身不是发布条件。 |
| 已知限制与发布判断 | F07 和后台截图根因未定，保留实际失败与安全拒绝证据；若发布目标要求解决对应稳定性问题，再对具体重现排障，不靠重复成功次数追认修复。最终候选身份/文档收口随发布阶段办理，本轮不合并 main、改版本、建 Tag 或 Release。 |
