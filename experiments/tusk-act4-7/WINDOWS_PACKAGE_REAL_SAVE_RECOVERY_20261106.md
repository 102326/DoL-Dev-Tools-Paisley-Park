# Windows 独立包：真实 DoL 保存与原回执恢复

2026-11-06（Asia/Shanghai）。**本轮通过。** 固定独立包在新建空白 PC 环境中执行一次原生保存；自有 CLI 在原终态返回边界被实际终止，SQLite 保留原 pending，新 CLI 用同一原回执结清。最终动作数 1、Goal Completed，没有新增未决效果。

这是 [当前 TS 源码真实保存](WINDOWS_TS_REAL_SAVE_20261106.md)之后的新实验，没有重复该批已结清的动作或使用其 Profile / Store。脱敏结果见 [验证摘要](windows-package-real-save-recovery-results.json)。

## Delivered

运行时工作树 HEAD 为 `add12e2e4bb9ed24490c9125d63af052ed7f2bb3`。实际使用源码树外、中文及空格路径中的既有独立包，代码提交为 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`；当前 HEAD 与其生产代码无差异。未从源码补模块或改动包文件。

| 身份 | 实际结果 |
| --- | --- |
| 固定 ZIP SHA-256 | `62b95509df39b010602235922a275d32109000b53a1423bc1b34a599bf39a8da` |
| 文件核验 | [431 文件清单](windows-package-manifest.json)逐项匹配；无额外非依赖文件；实验后 431 文件仍全部匹配 |
| 生产入口 | 包内 `scripts/dol-dev.cjs`；Node 26.12.1，使用 `--no-strip-types` |
| 版本 | 包与 CLI 均为 6.1.0；7.0 为研发目标，没有改版本 |
| 依赖 | 锁文件 XState 5.33.2，实际解析到包内 `node_modules` |
| 宿主 | Windows，PowerShell 7.6.5；Chrome 156.0.8078.80，headless |
| 游戏 | 获准的 Lyra 合集 HTML；实际 DoL 0.5.12.13 / SugarCube 2.36.1+34 |
| HTML SHA-256 | `0e804505ee6829170936922efce86669387ea17522cd1a3c89c9058edde4e6f8` |
| Recipe | 包内 `docs/recipes/dol-save-state.cjs`；SHA-256 `885d9962e7d9261be54d77ac07bbc065762f7605d8e0485203bdddf9abcef018` |

新建独立空白 Profile、未复用的 loopback origin、SQLite 和 Evidence 目录。只提供 HTML 快照，不托管目录。未复制用户数据，未访问上一批或更早的 Profile、Store、pending 和 Unknown。没有接触 Android、日常 Chrome 或当前 UI 工程。

## Validated

### 包内执行与原生结果

Chrome 启动、准备动作和只读连接均加载包内模块。首次观察时游戏脚本尚未就绪；后续只读观察确认版本和入口控件后才行动，没有重载或猜测版本。三次标准 Debug Action 准备新游戏，停在 Start2；这些点击不计作 GER 保存。

目标槽 8 不存在，原生存档元数据为空。读取当前原生方法、hooks、marshaller、decoder 的指纹，填入既有 Recipe；attestation 保持。Scope 只含 `save`，Decision 只有一个保存候选。预算为 600000 ms、4 次动作、24 次观察、maxSpend 0，实际保存报价为 0。

通过包内 CLI 的 `game-goal-start`、`game-session propose` 和一次 `game-session dispatch` 运行生产 coordinator。没有测试专用 Recipe 或 `readOutcome` override。状态谓词初始为真，但 required checkpoint 为 `save-witness`，Session 初始保持 Active，不能零动作冒充本次保存。

### 实际中断与恢复

复用此前审查过的“暂扣原终态返回”方法，仅调整包内 CDP 模块路径和本次输出位置。编排脚本与注入文件留在本地忽略目录，不属于固定包。注入只在 Node 侧等待真实 `Runtime.callFunctionOn` 返回 `occurred` terminal 后，记录原值并暂不把它交回 coordinator；不改页面、Recipe、guard、terminal 或原生 API。

实际序列：

1. 页面生成本次唯一 terminal。独立核对页面原记录与捕获值完全相同，原生槽已存在，metadata 为本次 trial，记录摘要与原 terminal 一致。派发进程载入的 55 个包内模块全部来自独立包；额外文件只有本次注入脚本。
2. 只终止该自有 CLI，实际退出信号为 `SIGKILL`。没有杀 Chrome、ADB 或其它进程。
3. 新的包内 CLI 执行 `status`：Session 为 `needs-result-interpretation`，pending 为 true，SQLite 原 Effect 状态为 `dispatching`，动作数 1。原 attemptId / contextNonce / requestDigest 与页面 terminal 一致，尚无结算结果。
4. 不带注入的新包内 CLI 执行 `resume`，没有再次 `dispatch`。同一 Effect 变为 `settled / occurred`，原 binding 和 terminal evidence 完全一致。slot 摘要、metadata、解码状态及当前游戏状态与中断前独立读回完全一致，动作数仍为 1，pending 为 false。
5. 核验本 Session 的保存见证后才提交 `save-witness` 检查点。最终 Completed、一个 settled Effect、spent 0、reserved 0；原 deadline 没有延长。

`start`、`propose`、中断后的 `status`、`resume`、`checkpoint` 均退出 0。派发进程的非正常退出是本次实际故障注入，不记为正常退出。恢复读取同一文档中的原 terminal，没有从本地捕获文件导入或重建页面回执。

原生保存的 after 状态对应保存前 marshal 投影；当前 money/time/passage/turns 不变。这里只将一次 GER 派发、一个原 attempt、原 slot 摘要不变及原回执恢复作为证据，不根据 ACK 或截图认定业务成功。

### 现场与清理

三次准备动作和最终只读采集均保存 DOM、CSS、截图及连接期间事件。本次截图成功；前后 frameId、loaderId、uniqueContextId、URL 和 Profile 身份一致。

自有 Chrome / HTTP stop 已返回，原 CLI 和 Chrome PID 均不再存活。首轮 netstat 仍见原 CDP 端口 `LISTENING PID 0`，因此当时没有确认端口清理。后续仅对该端口进行只读 TCP/HTTP 核对，没有得到连接或响应；随后两次系统快照均无 LISTENING，最终只有 TIME_WAIT。未再结束任何进程，初始记录保留；该短暂 PID 0 记录的物理原因仍 Unknown。最终进程和监听清理已确认。

本次 Profile、存档、Store 和原始输出保留于本地忽略的 `artifacts/windows-package-real-save-recovery-20261106/`，不上传。包文件未修改，没有新建运行平台或更改生产恢复逻辑。

## Not validated

- 没有在真实游戏中更换文档后恢复、浏览器崩溃或 OS 断电；本轮保留同一原文档，仅实际中断自有 CLI。
- 没有操作 Android、日常存档、其它业务、其它 Mod 组合或完整图像资源。没有重跑未改代码的完整 Node / Python 套件。
- Windows Node 26.0.0、真实历史 CRLF 回执、历史 Unknown 的处理仍不属于本次通过范围。

## Known limitations

本次证明固定 HTML 和已审原生 IDB Recipe；不外推为全部存档格式或所有游戏版本。故障注入发生在 Node 已收到真实 terminal、coordinator 尚未得到返回的位置，不等于任意保存阶段断电均可恢复。

历史 F07 和后台截图失败的物理原因仍 Unknown。本次短暂 PID 0 监听记录也未作根因判断，保留失败快照和后续清理证据，不以实验通过覆盖它们。

当前范围可标记 Completed，无需改生产代码。下一项无平板候选为：在另一个新建空白 PC 环境中，验证当前独立包的受审原生导航 Start2 → Orphanage Intro 及可能自动保存的 Scope，核对原状态和结清；本轮未执行该项。整体 7.0 发布、main 合并、Tag、Release 均未开展。
