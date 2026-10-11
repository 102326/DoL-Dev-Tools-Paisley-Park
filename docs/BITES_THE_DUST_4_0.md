# DoL Dev Tools 4.0 — Bites the Dust 开发记录

状态：开发中，未发布。稳定基线为正式 3.0.3，`c5363060efdde8b724a5bbc8df3dd5140c32ca09`；开发分支 `development/bites-the-dust-4.0`。Tusk ACT4/3.5 不再作为研发计划；历史资料保留，只复用与当前合同直接相关的已审实现和测试。

## 本轮范围与 Done

按 Bites the Dust 最终执行计划书和用户的自主调试验收调整通知执行：Debug 与 GER 同批放权；既有 Runtime/Effect Ledger 内完成可选消费、项目实验、存档/自动保存、重复探索、目标重绑和真实数据代次；修复 Q1a/Q1b/Q2/Q3；落实 Android CLI/Skills/Knowledge Base 协作；收口制品身份、失败留证和恢复继续。候选制品与工作流一致性核验后，再判断本轮能力是否完成。

**历史故障重演已取消。** 不恢复 Soft & Wet 2.3/2.5 已修问题、不制造故障、不执行历史 Plan B。使用本轮真实源码缺陷的调查、修复和回归验证工程能力。完整 Android Mod 自主修复闭环在没有当前适合案例时标记 **Not Validated**；不冒充通过，也不阻塞其它必交实现。

保留 CLI/Skill/Store/TargetKey 身份。用户已授权指定测试 App 及数据内操作；写前重新核对设备/user/package/签名和数据域。重载自动继承有效授权，但执行绑定必须显式重新建立。正式 3.0.3、已安装稳定 Skill、历史 Tusk 和未决事实保留。推送、正式合并、Tag/Release 和公开现场证据仍需另行确认。

## Delivered / 当前实现

| 切片 | 实现及边界 |
| --- | --- |
| A1 Debug | 复用 Action/Journey/evaluator，自主调查、状态准备、导航和已授权数据重建；不为普通读取/点击强制创建 GER Goal。授权范围变化与易变执行句柄变化分开。 |
| A2 可选消费 | 新请求缺上限为 null；显式零/有限预算、父子有效限额、候选/派发/结算/完成/view/resume 一致；旧缺字段按零读取。零价交易需要实际 quote/库存/moneyStats/moment 和 terminal，不以不扣钱代替购买证明。 |
| A3 项目实验 | 复用 GER CLI 的单一 reviewed Recipe Provider，范围/源码摘要/独立 Outcome/原生 Goal Predicate；源码迭代不追认旧未决操作。见 [配方合同](PROJECT_EXPERIMENTS.md)。 |
| A4 存档 | 明确 save Scope 传到原生 producer；支持 reviewed IDB autosave transaction/readback，独立 numbered save/create/overwrite/load/delete Recipe。不同后端/hook 仍需 reviewed 支持，历史 no-save 恢复合同冻结。 |
| A5 重复探索 | 三次无进展改为提示；第四/第五次已终结实验及 resume 可继续，未知效果不盲重放。 |
| A6 资源代次 | 原 Store/TargetKey 内表达获证实 native App-user-data 重建，旧记录继续可见；自报 UUID/换库不构成隔离。见 [代次合同](RESOURCE_GENERATIONS.md)。 |
| Q1a | SQLite 事务内 approved snapshot CAS；执行成功预留 Effect 的同一动作，双连接竞争拒绝 stale Decision。 |
| Q1b/Q2 | 实际 callable/receiver 绑定；可信本地 provenance + 开始标记区分未派发与 Unknown。复制对象/页面自报不能取得零派发语义，普通 Debug 不被强制加入 GER 认证。 |
| Q3 | owner 在 LIMIT 前筛选；精确持久 terminal 安全回收；超过 64 条及提交/清理中断恢复，started/Unknown 保留。 |
| Android | layout 区分缺工具/权限/进程/执行/输出/JSON/布局失败；不可变 frame/loader/unique context 拒绝旧持有者，显式新绑定；复用已装 CLI/Skills/KB，来源和现场证据分开。 |

## Validated / 本轮 Windows 与真实 Android

- 源码与最后行为回归固定 `467f32e15d6929e13bf2d4bc5d9fcc0bae33a146`：Node **393 passed / 0 failed / 0 skipped**；定向 window 回归 56 passed。未改 Python，复用有效 **2 passed / 2 optional-dependency skips**（Pillow、JSON Schema/date-time）。Node 24.19.0、Python 3.14.7、锁定 XState 5.33.2，复用已有依赖，不新增安装。
- 同一获授权 Android 17 / WebView 154.0.8037.58 / user 0 的 DoL 0.5.12.13 测试包：真实文档重载 10 项身份检查、显式新绑定及自有 forward 清理；PID/target 不变仍拒绝旧 Document client。
- Android CLI 1.0.16486076 实际 version/help、标准 native-layout；实际安装 Skill list、相关内容身份；真实 KB search/fetch 及返回文档/时间/Android 适用性记录。layout 不证明全部控件或 trusted touch。
- GER 标准 CLI 完成五项 native save/create/overwrite/独立货币准备/load/delete 试验；真实状态恢复、terminal、fresh checkpoint 一致。另有真实 native navigation autosave **1 个 transaction commit + original archive readback**，owned observer 恢复；其它 count 0 导航不算写档试验。
- 原生真实零价购买：受审准备使原成本设置报价为零；实际 inventory 0→1、money 0→0、spentCount/time 改变，bound receipt occurred/settled、Goal completed、预算 0。随后恢复原成本设置为 1。它不是原经济中天然免费商品。
- 本轮真实缺陷：one-item 候选缺 quote/terminal binding，实际购买 ACK 后无法结清。修复复用已有原生购买 producer；新候选绑定，旧 unquoted 写入在派发前拒绝。旧 ACK 不追认。原 60s preflight 失败未派发；只读测量 83,782ms/584 CDP calls 后使用既有有界 120s window，显式 resume + fresh Decision 的后续真实购买完成。
- Q1b/Q2 真实 WebView 生产 Action 边界 4 检查：callable 替换前拒绝且零调用；trusted pre-marker 拒绝保留 notDispatched；复制 provenance 不取得零派发；post-marker 自有 DOM 变化后不伪称未派发。清理 owned 属性/callable，原游戏 money/passage/turn/time 不变。它是受控 Action 夹具，不是购买中断或 durable GER 崩溃试验。
- 四次获证实的原生数据重建与失败后继续；原 81 Effect docs/status、21 Session docs 和后来四条未决 Effect 原合同保持不变，同一 Store/TargetKey 历史可见。实际失败包括已写 save 的 delta 读取失败、派发后 navigation 超时、缺绑定购买 ACK、可信派发前拒绝；失败和成功独立保留。
- Q1a/Q3 的并发 SQLite、66 Session 回执容量、持久提交/回收中断为离线/受控 DOM 验证，不冒充手机 66 次真实业务。

原始日志、SQLite 一致备份、APK 签名/摘要、游戏源码/存档和阶段证据只保存在 ignored `artifacts/bites-the-dust-{offline,document,resource}-20261011/`，不提交或公开。详见下方按固定提交记录的历史切片。

## Not Validated / 覆盖说明

- 完整 Android Mod 自主修复→构建→持久部署→实际加载→同条件复验；没有当前合适 Bug，不补造案例。
- 设备物理断连恢复、CLI trusted touch、更多设备/Provider/游戏/Mod 组合。
- arbitrary save backend/hook、全字段存档迁移/备份恢复、每个原生 producer 的实际 autosave。
- 手机上的完整 durable GER 故障注入和 66 次真实业务容量；已有生产 Action 检查及真实失败留存分别证明其有限范围。

## Remaining work / 当前收口

- 候选工具制品、CLI/Skill/文档版本和使用入口一致性；实际使用来源身份与错制品拒绝对照。
- 最终证据矩阵与本地候选交付审查。上述未覆盖项不自动转为阻塞任务。

## Known limitations

新 null 消费合同不能由稳定 3.0.3 反向读取；native data-reset 将共享 Store 升至 schema 3，稳定版不得继续写入该 Store。当前 scoped save Producer 使用有界 120s，caller/Session deadline 仍可先到期；没有 save Scope 的原路径保留 30s。技术超时不证明远端取消。

已购测试物品/当前游戏状态是本轮授权实验数据，不声称完整回滚。历史 Unknown 继续未决，不因新成功或真重建变为成功/未发生。外部 storage/cloud/shared UID 不在本轮原生隔离证明内。历史 Soft & Wet 材料保留为资料，重演候选已取消。

## 按提交保留的过程记录

以下是各切片当时的结果；后续更新以上方当前状态为准。旧失败/原合同保留，不用新实现回填旧成功。

### 2026-10-11 Scope / native resource generation

本地实现提交 `b9e26a5562e7d7058f8357e5dcafbba1878dd551`，实际 CLI 入口修正 `347467c8c89ddcb800b3d8f568366c71d8f5ab38` 和共享 opener 接线 `726d80eccae4c345408f00a07ab3362eb7b540b9`。后续阶段化失败证据和 scoped Debug 原生代次核对以实际 diff/提交定位。复用 Scope，不建立新权限服务或第二 Ledger。详见 [数据代次合同](RESOURCE_GENERATIONS.md)。

Windows 定向回归和完整 Node 回归通过；阶段化证据修正后完整套件 373 passed/0 failed/0 skipped，新增 Debug 身份拒绝另作定向回归。Python 不涉及，复用已有 2 passed/2 skipped。原始入口失败和 partial 原生尝试都保留，未跳过或把失败改写成通过。

真实测试 App/user 0/Android 17 的标准 `action data-reset` 已完成一次可核验的 native clear、空数据检查、UID/根目录/签名摘要复读和自有 marker 复读。使用原 `sessions-v2.sqlite` 和相同 TargetKey；SQLite 一致备份在本地 ignored 证据目录。81 条旧 Effect 和 21 条旧 Session 的原始 doc 摘要及状态逐条保持不变；旧 owner resume 拒绝，JSON 自报 proof 拒绝，新 Session 从原生 snapshot 建立，并在视图继续暴露旧 Unknown。没有将旧 Unknown 结清，也没有派发 Gameplay 业务。

真实证据 `artifacts/bites-the-dust-resource-20261011/validation-corrected.json`、各 reset manifest/分阶段文件、source diff 和备份均保留本地。首次 CLI 读取函数和未导出 opener 的调用接线问题已修复并补真实入口/生产 Action 替身回归；两次均未进入 native clear。随后 partial native 尝试只保留到了 fenced 阶段，具体原生失败原因未捕获，因此标记 Unknown，不能将后一次成功倒推为前一次成功。补阶段化错误证据后 fresh authorized rebuild 完成；保留两次 native 代次元数据。最初 verify 脚本的 JSON-proof 拒绝试验用了包含多余字段的 target，已更正为 canonical target 并核对真实 proof 拒绝错误，原日志不删除。

Store schema 只在重建开始时从 2 进入 3；旧数据内容不迁移。稳定 3.0.3 不得对该 Store 继续写入；新连接拒绝 schema 3，已经打开的旧连接也不能重新取得该数据代次的 lease。原生外部 storage/cloud/shared-UID 资源不在此隔离证明内；不是完整 App/存档恢复验收。这是当时的切片结论；后续实现和调整后的验收以顶部当前状态为准。

### 2026-10-11 native save cycle and retained failed attempt

At `bbdfb2148236b95b4854079512660920c3166500`, the authorized Android DoL 0.5.12.13 IndexedDB target completed the standard GER CLI create → overwrite → independent currency preparation → load → delete trials. Every trial dispatched once, independently proved its native Outcome, settled in the original shared Store, and passed a fresh original-state checkpoint. Autosave stayed enabled. These are native archive/player projections, not full-field migration or backup-recovery proof.

The first save attempt under `512a9bb…` genuinely wrote a slot, then its history-only reader rejected the native delta archive. Its original Effect remains started/Unknown under its original Recipe binding. The reader now pins and uses the original native delta decoder and marshal-for-save projection; no new reader reinterprets that old Effect. A second authorized, verified native App-data rebuild established the next resource generation before the new trials; no new Store/TargetKey was substituted.

Private `artifacts/bites-the-dust-resource-20261011/save-cycle-validation.json` records the five CLI trials and native results. All original 81 Effect docs/statuses and 21 Session docs remain unchanged; the newer failed-save Effect also matches its consistent backup byte for byte. Both historical Unknowns remain visible. The completed load restored the independently prepared money state from the native saved record.

Full affected Node regression at this source: 381 passed, 0 failed, 0 skipped (`save-delta-node.log`); unchanged Python results reused: 2 passed, 2 optional-dependency skips. No full suite was repeated merely to report these real trials. The copied native autosave/ironman guards still require the A4 scoped contract change; these Recipe trials alone do not close A4 or formal 4.0.

### Scoped native autosave contract (representative native navigation verified)

A4 now passes the persisted host Scope into native navigation, radio and the existing shop/head-wardrobe producers. With explicit `save` authority, autosave/ironman flags describe gameplay rather than an unconditional ban. This does not waive business, receiver, history or source guards. The original native environment profile remains the compatibility reference; only save policy fields are normalized for scoped producers. Without save authority, its original no-save behavior remains.

Reviewed DoL 0.5.12.13 IDB observation uses the native onSave callback and actual `IDBObjectStore.add` transaction complete/abort events. Immutable Save/idb methods are not replaced; `idb.lock` is not completion proof (openDB clears it before write completion). The finite owned observer correlates the native autosave projection/date, original `saves`/`details` transaction and independent native archive readback. Its callback/prototype observation is restored before terminal publication; conflict, abort, unmatched write or unproven readback keeps Unknown. Current native gameplay observer supports slot 0 autosave; explicit numbered save operations use the reviewed Recipe. Other save backends/hook versions require reviewed Provider support, not an invented permission denial.

New producer contracts use a distinct `-save-` form and require their additional save witness. Legacy receipts never inherit that permission or witness. The narrowly reviewed legacy street recovery retains its frozen no-save conditions. No new Runtime/Ledger or background service was added.

Offline directed observer/navigation tests: 29 passed. Full affected Node suite: 388 passed/0 failed/0 skipped (`scoped-save-node.log`). Real Android read-only observer binding/source/receiver review succeeded; this is not an autosave transaction trial. Python is unaffected; reuse 2 passed/2 optional dependency skips.

At `2a0240724f24b6d2bfb00f43ea03a893b763090c`, the real Android native Bedroom → Bathroom trial produced exactly one observed autosave and one completed native IDB transaction; independent original archive readback proved the Bathroom archive. The action settled once, and a fresh original-state checkpoint completed. Native Save/onLoad hook counts returned to one each, and the actual IDB add descriptor returned to its original native method before/after publication. Ordinary outbound/return navigation with autosave enabled but no triggered save was recorded separately with count 0; it is not counted as a write trial.

The actual engine autosave setting was explicitly enabled through a reviewed scoped test-preparation Recipe to trigger the write. No archive, receipt or purchase Outcome was fabricated. A preparation timeout before dispatch settled not-occurred. The first post-boundary trial exposed a lower Journey 30-second cap despite the scoped Session window: its original Effect remains Unknown under that contract. The lower cap was corrected to preserve the scoped 60-second window and caller deadlines; only a subsequent authorized, natively verified data rebuild established an independent generation for the new trial. Checkpoint after a host lease expired was rejected; explicit resume followed by fresh original-state checking completed it. None of those failures was deleted or reclassified by the successful trial.

Private `native-autosave-validation.json` records the fixed source, transaction witness and cleanup. Original 81 Effect docs/statuses, 21 Session docs and all three historical Unknown records remain unchanged in the same Store/TargetKey. Other native save-enabled producers have offline contract coverage, not this live autosave proof. Native numbered save/create/overwrite/load/delete remain covered by the earlier five Recipe trials; full-field migration, arbitrary hooks/backends and full backup recovery are not claimed.

### Zero-priced purchase support

The reviewed clothing quote, one-item Goal, native reader, original-control operation and receipt/Goal predicates now allow an actual zero price. Explicit budget 0 still refuses positive spend. Inventory append, original moneyStats spentCount/time, moment submission, unchanged surrounding state and bound receiver/source remain required. The actual pinned native money function uses `amount > 0 ? earned : spent`, so a zero amount still increments the spent counter; unchanged currency alone cannot prove purchase. Positive-price contracts retain their previous receipt semantics. Directed regression: 32 passed; full Node: 392 passed/0 failed/0 skipped (`free-purchase-node.log`). The first directed run exposed the old zero-price rejection expectation; it was updated with a negative-price rejection instead. The later bound native trial below completed; this paragraph records the earlier implementation checkpoint. Python is unchanged and its valid 2 passed/2 optional-dependency skips are reused.

Dol UI's latest source/file-only reply confirms no newly established unfixed 2.5 defect. The old flicker artifacts have verified hashes but no precise matching source commit for both intermediate ZIPs. Historical replay is cancelled by the latest user instruction. The complete Android Mod patch/build/deploy/load/verify loop is Not Validated without a current suitable case; it is not a blocker for the remaining core work.

### Real zero-price trial exposed missing one-item terminal binding

At `da3a69c6ab15e28dd4355de18b45c53511273726`, authorized preparation changed the original clothing-cost multiplier and test currency to zero without touching inventory. Standard Debug navigation handled the original tutorial and reached the native shop, then selected the original head/hairpin controls. The standard GER one-item action dispatched once; native inventory increased from zero to one, currency remained zero and its Scene predicate became true. The existing one-item path, however, carried no quote/terminal execution binding, so its transport acknowledgement correctly remained pending instead of completing the Goal. This is a production call-chain defect, not a successful settled transaction. The exact original Effect and evidence are retained; no replay or retrospective receipt is allowed.

New one-item candidates now carry the same bounded original quote and delegate to the existing native purchase producer, including scoped save handling. Exact requested variant, baseline, price and child budget remain checked. Unsupported inventory/worn baselines omit the candidate; legacy unquoted purchase writes fail before dispatch instead of creating another unclosable acknowledged effect. Existing unquoted historical records are not upgraded or interpreted with the new producer. This reuses the native business contract; it does not create a second Runtime or a synthetic Outcome from current inventory.

Directed regression: 62 passed. Full affected Node: 393 passed/0 failed/0 skipped (`one-purchase-terminal-node-final.log`). Earlier failures identified obsolete candidate expectations and fixtures missing the actual worn-count field; logs are preserved, and negative-price/missing-witness checks remain. A fresh, genuinely independent data generation is required for another real transaction; the current generation's unresolved one-item action cannot be bypassed by Debug, a new Store or a new Session.

After the verified native data rebuild, the bound one-item trial timed out before dispatch under its 60-second window and settled not-occurred; inventory did not prove a new action. A separate read-only `attestOnly` measurement completed successfully in 83,782 ms across 584 CDP calls, including cleanup. The scoped save-capable Session/Gameplay Journey now uses the already-supported bounded 120-second Journey window and still clips to the Session/caller deadline; the no-save path remains 30 seconds. No business/source guard or dispatch marker was removed to make attestation faster. Targeted regression: 56 passed; full Node: 393 passed (`measured-shop-window-node.log`). This measured adjustment permits a fresh Decision after a proven pre-dispatch failure; it never authorizes replay of the older unbound acknowledged purchase.


### Bound native free purchase and real Action boundary checks

At `467f32e15d6929e13bf2d4bc5d9fcc0bae33a146`, the explicit fresh Decision after the proven pre-dispatch timeout completed one original zero-priced hairpin purchase. The native bound operation took 93,371 ms; original inventory, moneyStats and moment witnesses passed, the effect settled occurred exactly once, and a fresh checkpoint completed the Goal with maxSpend/spent/reserved all zero. The price modifier was then restored through a separate reviewed scoped Recipe; game inventory was not rewritten. The original unbound acknowledged purchase remains unresolved under its original contract.

Private `native-free-purchase-validation.json` retains the new binding, native business proof, preserved historical records and negative trial. `q1b-q2-real-action-validation.json` records four actual WebView production Action checks with cleanup and unchanged game state. Its post-marker owned DOM side effect proves that result cannot be classified as authoritative no-dispatch; it does not create or settle a game Effect, and is not a durable purchase interruption trial.
