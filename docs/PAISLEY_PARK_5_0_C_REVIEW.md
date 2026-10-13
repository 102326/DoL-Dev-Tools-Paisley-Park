# Paisley Park 5.0：C 主线真实任务复盘与接续

当前范围：保全 A/B，以真实研发轨迹检查能力选择、身份接续和结果证明；仅按证据调整 Skill/Recipe，不扩建 Runtime、Ledger 或 Runner。本文包含原任务离线复盘与 2026-10-14 新执行的平板只读接续核对，二者分别记账；不重演打赏。

## Delivered：固定现场与任务关联

- Tools 测试分支快照 `b3edfab9e2a709ec676813e8cbbe5af1f57fa967`，稳定 main/已安装 Skill 为 4.0.1，`cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1`。
- UI Lab 测试分支 `933a6d90c0d775f84649e19a1415b642aa356dee`。两份工作树入场干净，远端测试快照一致；A/B 原有验收复用，不合并 UI 2.5 到 3.0。
- 首个 C 案例：用户要求在独立测试平板检查 SmartPhone Alpha 3.88 的异常打赏，后来明确卧室直播和文章入口均需调查。原任务是诊断，**未承诺修改第三方业务规则或制作修复包**。
- 原任务来源：“DoL 0.5.12.13 Mod 兼容适配”，原 turn `01a1307f-f613-7543-915f-913c936f5bf6`。可核查 64 条命令记录，其中 11 条失败；已有阶段文件、失败和最终报告，不重新执行操作。
- 原 ZIP 与独立副本均为 `80fac6b1b6eff32122c3884fb18f5aa113897f987ffeff07c392bc14e32b17d2`；17 个已提取文件与 ZIP 原字节相同。原源码身份用 ZIP/文件摘要，不伪造第三方 Git revision。

本轮在既有 Skill 的 Fix/Verify 段增加短链接，按需读取 [接续 Recipe](DEVELOPMENT_FLOW.md)。未更改自动发现策略、运行实现、4.0.1 全局安装或 UI 源码。详细原命令 ID、已有文件哈希与算术核对位于 ignored `artifacts/c-flow-review/`，原存档、截图、完整设备信息不复制到公开文档。

## Validated：调查证据及其等级

| 问题 | 可复核事实 | 结论与限制 |
| --- | --- | --- |
| 卧室直播是否独立结算 | 记录为开发占位页，节目目标缺失；其渲染触发全局文章检查。 | 不把发生在直播页的文章通知称为直播业务结算。 |
| 同一时间内是否重复增加收益 | 修正为每次读取当前对象后，4 次原页面渲染增加 £110，时间戳不变。 | 证明选定控制输入下的渲染收益路径，不代表所有存档。 |
| 能否累计超过 £10,000 | 有界直接调用原收益回调 239 次，新增 £10,058，游戏时间不变；随后完整渲染侧栏显示 £10,442。 | 回调实验不是 239 次自然游玩，也不是单笔 £10,000；有独立刷新显示证据。 |
| 是否货币重复换算 | 两段记录的 earned 增量与 money/100 增量完全一致。 | 初期“×100 可能多换算”的解释不成立，保留被排除假设。 |
| 源码与原制品是否对应 | `:passagerender → onPassageRender → yenotesCheck`，免费打赏通过原 money 宏入账，源码与原 ZIP 对应。 | 支持当前条件下的因果解释；如何改结算间隔属于业务决策，未制作修复。 |
| 安装是否等于加载 | 原安装回执 verified；原重启 Action 与重新观察记录确认运行版本 Alpha.3.88。 | 是原包加载证明，不是新修复包构建/部署/复验。 |

本轮实际执行的是只读文件/hash/算术/源码核对与入口定位。复用既有 Android 观察，不将其计为本轮新实机运行。

## 接力、失败与可复现摩擦

用户只补充了实际入口和异常金额；不是每个工具阶段都要人工批准。Agent 自行选择源码检查、标准 Action/capture/dom-inspect、ADB、直接 Playwright/CDP 和受控原 API 实验，没有创建不必要的 GER Goal。

原错误分别归属为 API 发现、未暴露 Engine 全局、Python UTF-8/GBK、真实遮挡、旧 moment 对象引用和 transport 等待；不能合并成工具失效。保存了可用的失败及新观察，原安装运行会话被轮询，未重发安装来猜结果。

**仍有实际身份/记录缺口：** 原直接脚本使用 `contexts()[0].pages()[0]` 和固定端口；虽然有初始 App/PID/socket 核对和重启后的再核对，却未逐阶段保存 loader/uniqueContext。相同 URL、调用者填写 serial/package 不能补足文档绑定。脚本按 stage 固定文件名写入，多次相同阶段可能覆盖先前结果；当前 helper 文件也不是每次历史调用的冻结字节。因此不追认完整连续性。

Recipe 针对这些已观察摩擦复用现有 execution-context、当前状态重读和既有证据引用，不新增执行器或固定报告门禁。单个案例只进入按需资料，不晋升所有任务的强制默认流程。

## A/B/C 与 C-EXT 状态

- A/B：保留既有 Scoped Done 的有限原型口径，生产源码未因本轮改变。
- C：**代表性接续范围 Scoped Done**。原打赏调查仍保留缺失的历史文档身份；下述新只读混合任务独立证明标准 Action、生产执行绑定、源码/制品核对和实际加载结果能自然接续。没有把它记为完整 Mod 修复或全部 Debug/GER 组合验收。
- C-EXT：采用现有 Skill 渐进披露和轻量原 ID/文件关联思想；没有安装 OpenTelemetry/Collector。原调查已用 Playwright/CDP，不等于本轮完成 CLI/MCP 对照。DevTools 重诊断、rrweb、性质测试、BiDi 均未触发，不构成剩余必交工作包。

## Not validated / Known limitations

单笔大额、反馈者原组合、正常人工发布的时序问题、付费文章及第三方修复效果未验证。不同 helper 阶段的原文档连续性不能补造，截图/通知也不能替代业务结果。

离线复盘入场 ADB 无连接设备；2026-10-14 用户确认测试平板已连接，完成下述接续。本轮不重新打赏，不保存/加载/覆盖/删除存档，不改 Unknown 或 Store，不公开推送/发布原始证据。

## 2026-10-14：新只读混合任务的真实接续

本次问题是：已授权平板当前运行的 UI，是否对应本地当前研发包？这是实际加载核对，不是新 UI Bug、业务修复或旧打赏重演。使用 Tools `a41664ff8683f7bbd477493ae1c17f654f0f9ab9`，UI 工作树为 `c2fcbd130527da80c1a791094230f2434b70bc7c`，两者入场干净；UI 源码仅阅读，未重建或部署。

### Delivered / Validated

- 平板 M367FC / Android 17 / user 0，精确测试包 `com.vrelnir.dol.lyra.uicompat051213`。入场前台是桌面，测试包未运行；先复用标准 Action 的静态 plan，再执行一次 launch。Journey `202a2380-8ce9-492f-a0c7-40d77134e2e4` 为 complete。manifest 的 App 字段采于 launch 前，不能拿前台=false 当作启动后的结果；后续独立核对前台、PID、socket。
- 只选择该 App 的调试 socket 及唯一 `https://localhost/index.html` page，使用既有 `execution-context.create/ensureWebview/finish`。记录 targetId 与 frameId、loaderId、uniqueContextId、timeOrigin 的独立字段，生产绑定在每次调用前后验证；每阶段和整段观察均保持同一文档、进程及原生数据资源身份。
- 当前 DoL `0.5.12.13`、SugarCube `2.36.1+34`、ModLoader `2.101.1`。DoLGameUI 及其 Runtime 报告 `3.0.0-stone-free.1`；SmartPhone Alpha 的 ModInfo 与 Runtime 均未观察到，不再安装它。运行列表不等于全部导入库存/执行顺序。
- 当前本地 ZIP 是 `1a8ad1b5d0ceca3eec2966d55f19f3e6dd2036485ea0122c989e4921297f5c85`，与 UI 自己的原生动作原型构建记录一致；当前源码 HEAD 只是观察到的工作树身份，不另推定它能重现所有历史制品。
- 平板 ModLoader 已存 UI ZIP 的只读摘要是 `2045bb55d9d36d39ad6ef9f5e9ad1dd1ac5fdda8a28096ec59bd39b0fbb82fe7`，与本地既有备份及历史 build/deploy 记录一致。只读事务仅取 UI ZIP，未读取游戏存档，未创建/升级数据库。
- 实际 ModInfo 的 JS/CSS 内容及 DOM 中包含的原资源匹配这个备份包：JS `be9730bd8843655d157a25d3d5245448718ea500c52d39f298dc5a129954cdab`、CSS `145d3462880f63ad5a278782b3e737ecf42d55fd1e152f6f4c297fe77caa291f`。二者均与当前本地 ZIP 不同。Runtime 存在和 DOM 注入证明当前初始化/资源现场，不证明每条代码都运行或全部业务通过。
- **结果：排除“版本号相同，所以当前最新包已加载”。** 本次观察 complete、负例判断通过；没有重装包来制造匹配，也未把环境差异报告为 Tools 缺陷。UI 后续若需验收最新包，须由其部署流程另行核对。
- 原生资源身份前后相同；所有 Runtime.evaluate 均使用生产绑定的同一 uniqueContextId。CDP 与动态 forward 均由本轮创建并清理，forward 列表前后为空；未清理其它 socket 或应用资源。

本地原始记录位于 ignored `artifacts/c-flow-review/`：launch plan/run manifest、逐次新文件名的 environment/resources/artifact/continuity JSON、所执行 helper 的 SHA、生产模块 SHA、本地 ZIP 条目哈希及独立 assert 核查。最终接续运行时段为 `2026-10-13T16:16:38Z` 起（本地 2026-10-14 00:16），保留实际起止时间与命令关联，不混入原调查时间。所有设备标识、原生路径和详细列表留在本地。

### 最小修改及复用检查

新现场只强化既有 Recipe 的制品证明区分，没有新增 CLI、Runtime、Ledger、Store 或依赖。此前 Skill 格式验证、安装/resolver 单项测试及隔离安装验证仍有效；本轮对改过的文档补链接、范围、状态和 diff 检查。A/B 原验收复用，未改其实现；不为文档收口重跑全量 Node/Python/真机业务。

### Not validated / Known limitations

没有执行购买、换装、打赏、存档操作、页面重载或 GER Goal；没有制作第三方修复包，没有验收完整 Android Mod 自主修复闭环。新证据不能补齐旧打赏逐阶段文档连续性，也不证明最新 UI 包在平板已加载。未重测 Document 失效、GER Unknown 恢复或其它设备，相关生产逻辑未改，沿用已有适用证据与限制。

因此 C 收口的是**自然能力选择与代表性只读研发接续**，不是扩大 Gameplay、UI 发布或生态覆盖承诺。C-EXT 未触发的研究不构成阻塞。正式安装仍为 4.0.1；本轮未推送、合并、Tag 或发布。
