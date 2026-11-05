# 新 TS 基线：Android 文档替换与原账本只读核对

2026-11-06（Asia/Shanghai）。**真实重载后，旧生产绑定拒绝访问新文档，显式新绑定能够读取新文档。** 本轮同时核对了原账本与原生数据身份。Android 新业务结清没有执行：当前身份与原账本登记值不一致，页面也没有可供恢复的历史回执，不能用新 Store 绕过这些事实。

设备已于 **03:04:37 +08:00** 释放，实际 ADB forward 列表为空；本轮生产 transport 均已关闭。最后的页面观察为已就绪的 Start2，未停止 App 或 ADB server。设备释放后只做离线整理，不再连接。

脱敏机器可读结果见 [本轮摘要](android-document-resource-results.json)。这份报告没有修改 Runtime、Skill、安装包、版本或历史 Unknown，也不代表 7.0 全部完成。

## Delivered

固定源码输入为 `2a7f730c99f182694106900f86bd2a32fe1e11a8`，生产代码仍对应 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`。开始时工作区干净，HEAD 与研发远端一致。调用当前工作树预编译 CJS，使用 Node `--no-strip-types`；没有拿迁移前真机结果代替本次结果。

复用现有 `execution-context`、CDP、`game-resource` 和 `game-receipts`，将原 Android document 实验适配到本批输入和新输出目录。实验驱动仅存在本地忽略目录；没有添加新的 Host、Runtime 或测试平台。

## Validated

实际环境为 Windows `10.0.26340.0`、PowerShell `7.6.5`、Node `26.13.0`、ADB `37.0.1`，已授权的 M367FC / Android 17 / user 0 测试平板。ADB 位于既有项目 SDK，未在当前进程 PATH 中；仅设置本轮进程的 `DOL_ADB`。官方 Android CLI 使用显式项目 `--sdk` 完成一次 layout 和两次截图，截图均已检查，没有安装新工具。

当前前台测试 App 为 `com.vrelnir.dol.lyra.uicompat051213`，唯一目标 URL 为 `https://localhost/index.html`。现场读到 DoL `0.5.12.13`、SugarCube `2.36.1+34`、`DoLGameUI.version` 为 `4.1.0`，不能据此写成其它 UI 版本。此次没有重新核验 WebView Provider 的版本号；前一天记录保留其原时间。

### 真实文档替换

用户先明确允许重载当前 Start2 开局，随后允许操作该 App。本轮实际执行两次 `Page.reload`，均未点击游戏业务或调用保存、加载、删除存档 API；仅读取了已核对实现摘要的原生存档元数据。

| 检查 | 本次实际结果 |
| --- | --- |
| 同一 PID、同一 target 的 Document 替换 | loaderId、默认 uniqueContextId 和 timeOrigin 均变化，URL 不变。 |
| 旧生产 holder 读取 | `ANDROID_DOCUMENT_CHANGED`，未跟随新文档。 |
| 旧生产 holder 的 DOM object 调用 | 同样在绑定校验处拒绝。 |
| 底层旧 uniqueContextId / DOM object | 两者均由 CDP 返回 `CDP_COMMAND_REJECTED`。这些是只读失效检查，不是业务执行入口。 |
| 显式新建生产绑定 | 读取到实际新文档，游戏版本、Passage DOM、State 和 IDB 均已就绪。 |
| 既有存档边界 | 1–6 槽的全部元数据摘要相同；没有读取完整存档正文，不扩大为正文逐字验证。 |
| 原账本边界 | 全库 99 条 Effect 的行内容及资源记录摘要前后一致。没有创建或修改 Session。 |

修订实验的八项断言通过。未把以下首次失败删掉或计作通过。

### 首次就绪失败与后续实验

第一次从 **03:00:25** 发起重载。CDP 记录了真实 loader/context 替换，但 60 秒就绪窗口内没有读到游戏版本，且有两次 `CDP evaluation timeout`；实验最终因版本为 `null` 而失败。原脚本把游戏就绪放在旧绑定断言之前，因此这一次**没有完成旧 holder 拒绝断言**。清理完成，原日志和退出码 1 保留。

随后没有立即重载，只读观察和截图确认同一新文档已恢复为 Start2、turns 2、IDB 可用，六槽元数据与重载前相同。这个观察证明页面后来就绪，不说明首次为何超时，物理原因仍为 **Unknown**。

第二次受控实验调整了驱动顺序：先在 Document 替换时验证旧绑定拒绝，再等待游戏就绪；等待上限仅在实验中从 60 秒改为 120 秒，产品超时未修改。它于 **03:03:09** 重载，**03:03:49** 完成全部断言和清理，实际没有 readiness timeout。这是有明确实验顺序调整的另一次记录，不能用来追认首次成功或声称启动问题已修复。

### 原回执与原生资源身份

仅用 SQLite `readOnly` 连接检查已有默认 Store，没有调用普通 Runtime 打开、租约续期、恢复派发、迁移或清理。当前目标保留四条未决 Effect：一条 `acknowledged`、三条 `dispatching`；其中含旧保存。没有通过新建 Store 隔离这个真实目标。

- 生产 `game-receipts.recover` 对原有三条具备 execution binding 的未决动作返回空证据。页面在重载前就没有 receipt namespace，检查后也没有；没有初始化、补造 terminal、重放或把缺失回执解释成动作未发生。
- 生产 `game-resource.snapshot` 对原登记代次拒绝，原始消息为 `Native data generation changed`。当前 native identity 在本轮前后稳定，但与最后登记的 generation 5 不同。
- 进一步只读比对发现 marker 与最后登记值相同，签名、root、UID 和 inode 编号也相同，差异在 `stat` 的设备号部分。**这不足以证明 App 数据被替换，也不足以忽略当前身份合同。** 变化的物理原因及是否与挂载有关仍为 Unknown，没有自动改写登记代次或放宽比较。

这三项边界断言通过，只证明当前条件下拒绝/不补造证据正确；不计为 Android 业务成功、历史恢复成功或原 Unknown 已解决。

## Not validated

- 当前 TS 在 Android 上的新业务派发、结清及下一步，以及带真实原 terminal 的正向恢复；本轮没有对应有效输入。
- 原生数据重建、正常代次登记后的业务恢复、App 生命周期重建、主动设备断连和 Kotlin 探针。
- 真实历史 CRLF 回执、其它设备/Provider/Mod 组合、最低 Windows Node 26.0.0。

本轮没有生产代码改动，不重跑已有效的完整 Node/Python/Windows Chrome 批次；这些结果仍按各自原提交、环境与时间引用，不并入本轮真机计数。

## Known limitations / 下一步

当前 Android 文档身份专项已达到本轮 Scoped Done。**在这个已有 App 上继续正向 GER 验收的前提尚不成立**：需先查清登记身份与当前原生身份的差异，或准备经过确认的独立测试目标；不能换 Store、改 marker 或清历史 Unknown 来制造可运行条件。原回执缺失的四条未决动作继续保留。

本次启动就绪超时仍是保留的真实失败。后续若复现，应围绕该加载阶段采证；没有证据把它与历史 F07、某个 Mod 或 TS 迁移判为同一根因。

原始命令、驱动、context 事件、截图、存档元数据与设备/账本标识仅在本地 `artifacts/android-ts-device-20261106-025112/`。公开摘要只记录结果及文件摘要，不上传这些私人内容。需要复审原始输入时可从该目录手动提供；不能从公开报告反向补造原始证据。

## 后续离线核对：身份差异不自动迁移

后续以 `582d5c4c87b714e905575488dd3da7f1b2835582` 为输入审查生产调用。`game-resource` 将完整 device/inode 纳入摘要；`game-goal` 的新建快照、继续观察前后和派发前核验，以及带原 Store 的 scoped Debug 均复用该核验。`resume` 可先更新 Runtime 状态，继续观察之前才进行原生核验，不能概括为所有恢复都在写 Runtime 前查原生身份。独立只读复核得出相同判断：当前拒绝符合现有合同，是已观察到的可用性限制；现有证据不足以安全地自动接纳当前目录。复核方没有运行测试或访问设备。

另确认了刻意保留的历史恢复边界：已停止/过期 Session 的 Android `reconcile` 按原 attempt、context nonce、provider、contract、request digest 和终态证据结清原动作，受 Runtime 的 owner/generation/预约围栏约束；它不以当前数据证明原实例，不重新执行动作或判 Goal 完成。不能为了统一检查给这条路径追加当前 native snapshot，导致有效的历史回执也无法恢复。本轮现场原回执缺失，仍然没有正向恢复结果；不把此源码复核冒充实机通过。

Linux 官方资料确认存在[动态设备编号](https://docs.kernel.org/admin-guide/devices.html)。这仅支持“编号变化可能有其它原因”，不能证明本次发生了重启/重挂载，也不能从相同 marker 和 inode 追认代次连续。历史记录没有足够的底层卷身份证据，事后采当前挂载信息也无法补造当时的基线。因此本轮不修改代次算法、新旧摘要、旧登记、marker 或 Runtime。

补充的中性回归通过真实生产 `identity`、`snapshot` 和临时 SQLite Runtime 验证三种替身变化：只改设备号、只改 inode、两者都改，marker 及其它事实保持。三者均拒绝，登记和原未决 Effect 不变；恢复原事实后 snapshot 仍可正常读取。它是受控替身验证，不是实机重挂载或真实文件系统克隆实验。

实际 Windows 定向检查：新增用例 **1/1**；随后 `node --no-strip-types --test tests/game-resource.test.cjs tests/game-goal.test.cjs` **61/61**，失败/跳过均为 0。未重跑未受影响的完整本地套件；没有再次连接平板。命令、原始结果与官方资料快照留在本地 `artifacts/native-identity-offline-20261106/`。

下一次正向 Android 验收需要有效的数据边界：能证明独立的获准目标，或走已有、获准且完成必要数据保全的原生重建合同，继续使用原 Store 保留历史。当前 App 操作授权不构成旧数据连续性的证据，设备窗口仍须协调。不会为了本轮测试自行清数据或新增宿主。
