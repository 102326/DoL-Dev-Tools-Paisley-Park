# Android 独立环境：原生保存与中断恢复

2026-11-07（Asia/Shanghai）。**独立 Android App 的代表性保存与原回执恢复已达到本轮 Scoped Done，验收副本已对 user 0 卸载，设备已释放。** 原测试 App 的历史账本缺口仍未解决，不能据这次成功恢复旧任务或宣布整体 7.0 可发布。

本轮输入为 `0f5b77c3b43b870007cb74a7ae651840173a71f9`，生产代码为 `c4423ae4945687689e07397ca30d35400098d192`。开始时与 `origin/experiment/tusk-act4-7` 一致且工作区干净。包版本仍为 6.1.0，7.0 是研发目标；本轮没有修改产品代码、合并 main、改版本或发布 Release。

## Delivered

用户释放平板后，本轮先复查原 App 与既有备份。发现默认 Store 所在目录已不存在，未发现环境变量指向其它 Store；用户没有迁移印象，授权继续查现有备份。没有恢复、合并或新建原目标的默认账本，也没有对原 App 执行业务、重载、重启或数据清理。

随后用户另行明确授权安装 `org.goldexperience.acceptance7`，在全新进度初始化、保存一个新测试档、中断自有 CLI 并验证原回执恢复，最后卸载副本。该范围落实为独立安装身份、原生数据根目录、UID 和专用 Store；没有导入原存档或 ModLoader 缓存。新 Store 仅服务这个物理独立 App，不能用于原目标。

### 独立制品

从设备读取原安装 APK，不复制 App 数据；仅调整安装包名、provider authority 和显示标签。离线核对 DEX 与 34,467 项 assets 的集合及字节不变，签名与对齐检查通过。运行中没有 Soft & Wet 私有 Runtime；现场 `DoLGameUI` 不存在。

| 对象 | SHA-256 |
| --- | --- |
| 原安装 APK | `ab67be61aea19cb259dae155356f7621cd6114d3209c66ca88a4162cbb9b9585` |
| 独立验收 APK | `b78f1893520cbf7d65e363bf81a3b5a5c4684c62a353ff51fde6f40b47e2e0a4` |
| 独立签名证书 | `5dccd28438498a80741ba497e2ce80bbc0608a73f5d779189d02993f33ea8b2c` |

安装前确认 user 0 没有该包，不用覆盖安装。运行后核对独立包和原包的原生身份均不同，独立包原生存档列表为空。卸载前再次核对包、UID、root 和设备端 APK 摘要，只卸载本轮副本。

## Validated

环境为 Windows `10.0.26340.0`、PowerShell `7.6.5`、Node `26.13.0`、ADB `37.0.1`；获准的 M367FC 平板、Android 17、user 0，实际 WebView `com.google.android.webview / 156.0.8078.47`。游戏 `0.5.12.13`，SugarCube `2.36.1+34`，页面 `https://localhost/index.html`。设备标识、PID、完整上下文、原生身份和私人状态只留本地。

使用项目 resolver 确认当前工作树，运行预编译 CJS 并显式关闭类型剥离。复用生产 execution-context、Action/Journey、共享 GER、SQLite、原 receipt reader 和未改动的 `docs/recipes/dol-save-state.cjs`，没有另建 Runtime 或测试专用 Outcome。

| 检查 | 实际结果 |
| --- | --- |
| 初始化 | 新包最初为 Start、turns 1，原生 IDB 可用、存档列表为空；重新观察后按原控件进入 Start2、turns 2。 |
| 原生保存合同 | API/callback、decoder、marshal 摘要与已审 Recipe 一致；slot 8 原先不存在。Scope 只有 `save`，没有开放 `load-save` 或 `delete-save` 候选。 |
| Goal 与派发 | development Goal 要求 `save-witness` checkpoint；初始数值谓词已真仍保持 active。当前 Request 仅有一个 save 候选，使用完整 Decision 提交 propose 后派发。 |
| 实际副作用 | 原生保存 Promise 完成，独立读回存档记录及本次 trial 元数据；原生 receipt 已为 terminal / occurred，executionCompleted 为 true。虚拟消费为 0。 |
| 真实进程中断 | 在生产 `Runtime.callFunctionOn` 已返回原 terminal、但 coordinator 尚未收到时扣住传输结果，另一个只读连接核对原记录，再终止本次自有 CLI。SQLite 当时只有一条未结清 Effect。未杀 App、ADB 或设备。 |
| 新进程恢复 | 独立 CLI 对原 Goal 执行 resume，恢复同一 attempt、contextNonce、requestDigest 和原 terminal evidence，原 Effect 结清。没有第二次 dispatch，累计动作数仍为 1，原 deadline 不变。 |
| 完成证明 | 原生存档摘要与原 receipt 一致，记录数为 1；money/time/Passage/turns 未变。核对本 Session 的 settled save witness 后提交必需 checkpoint，Goal completed、pending=false。 |
| 清理 | 中断留下的自有 forward 按精确 serial/local port/WebView socket 归属移除；其它 transport 正常完成清理。卸载前后 forward 均为空，独立包已从 user 0 卸载；Store 和原始证据留本地。 |

受控中断沿用此前 [PC 原回执恢复实验](WINDOWS_PACKAGE_REAL_SAVE_RECOVERY_20261106.md) 的边界，只将宿主换成当前 Android 生产连接。它证明“远端保存已完成、本地未收到 terminal”的恢复；不声称覆盖所有崩溃时刻。

### 失败记录

- 首个初始化 Journey 在第一步报告 checkbox 已不存在，未继续第二步。它仍保留 failed / outcome unknown，不能改写成零副作用证明。重新只读观察确认弹窗已消失、场景仍为 Start，才选择不同的原生开始控件；没有重放该 Journey。弹窗消失原因 Unknown。
- 验收结束后尝试在后台只读复查原 App，返回 `CDP_DISCOVERY_TIMEOUT`。保留失败并清理连接，没有重启、重载或重试原 App。本轮不宣称已再次核对原六个存档内容。ADB 原生检查确认原包仍安装、UID/root/inode/marker 身份与本轮开始时相同；没有把这项身份检查当成存档内容证明。
- 事后源码/独立 ZIP 的严格字节比较在 `cdp.cjs` 失败：工作树是 CRLF，归档是 LF。46 个实际加载模块中 44 个有换行差异，2 个字节相同；全部 LF 归一化后相同。本轮是**工作树 CJS 实机运行**，没有宣称是 ZIP 的 Android 重跑，也没有重签旧 receipt。原始差异记录保留。

### 原账本与备份

默认 `PaisleyPark/sessions-v2.sqlite` 及其目录当前缺失，原因 Unknown。针对已知开发目录和历史备份的有界搜索没有找到与最后实测完全一致的副本；未尝试系统级数据恢复。

| 对象 | 已知事实 |
| --- | --- |
| 11-06 最后现场记录 | 全库 99 条 Effect；该 Android 目标 24 条，原资源登记至 generation 5。 |
| 本轮找到最完整备份 | 10-11 的 `store-after-unbound-free-purchase.sqlite`，95 条 Effect、35 个 Session；该目标 20 条，最新 generation 4。 |
| 四条旧未决 | 备份均保留，id、status、resourceGeneration 与 action 字段和最后现场记录一致。没有结清、删除或重放。 |
| 与最后记录的差额 | 该目标缺四条已结算 Effect；整个 Effect/resource 摘要也不匹配，不能把备份提升为最新默认库。 |

首次 Node SQLite readOnly 审计产生/更新了读者 WAL/SHM 记账侧文件，不能声称所有物理文件未动；数据库没有恢复或业务写入。后续确认 WAL 为 0 字节，再以 Python `mode=ro&immutable=1` 比对。最终重新核对四条旧未决，备份仍为 95 条 Effect，默认库仍未创建。

当前应继续保留原目标的业务阻挡。**不要让普通 Runtime 打开缺失路径创建空库，也不要拿这次独立包的成功解释旧 Unknown。** 有效原 terminal 缺失的问题与本次正向验收分开。

## Not validated

本轮没有验证原 App 历史 Unknown 的结清、generation 5 完整账本恢复、真实 CRLF 历史 receipt 跨构建恢复、其它 Mod 组合、购买/换装、主动设备断连或全部保存崩溃时刻。没有把旧包已通过的结果算作本轮实测。

此前 [标准 Evidence 与关闭连接绑定检查](ANDROID_TS_READONLY_20261105.md)、[真实 reload 后旧文档拒绝](ANDROID_DOCUMENT_RESOURCE_20261106.md) 保留各自固定输入；相关 Android 生产模块在此次基线间没有变化，复用证据，不重复实机计数。Windows 最低 Node 26.0、Kotlin 设备代理收益与 F07 物理根因仍保留原范围。

## Known limitations 与接续

独立场景的生产保存 → 原 terminal → CLI 中断 → 新进程恢复 → checkpoint 闭环已成立。没有发现需要修改 Runtime 的新安全失败。原默认 Store 缺失是原目标接续的实际缺口，备份不足以恢复最新完整状态；这不阻止上述独立场景完成，也不等于旧目标可重新派发。

原始 APK、签名材料、Store、终端回执、游戏状态、完整命令及断言脚本仅留在本地忽略目录 `artifacts/android-resume-20261107-023717/`；公开记录只含脱敏身份与结果。没有上传游戏文件、存档或设备标识。

本轮只需报告/链接/证据一致性检查，不重跑不受影响的完整 Node/Python 套件。按既有授权仅同步研发分支，main、Tag 和 Release 保持不动。7.0 更名仍在正式发布收口时处理。
