# TUSK ACT4 7.0：Windows 接续记录

2026-11-05（Asia/Shanghai）。**本批 Windows 接线、离线检查和独立包验收通过，可以同步研发分支。** 后半程保持无设备工作；新 TS 基线的 Android / 真实游戏复验待取得独占窗口。没有合并 main、替换已安装工具或发布版本。

后续补充：随后获得独占窗口，已完成[新 TS 基线的 Android 只读复验](ANDROID_TS_READONLY_20261105.md)并释放平板。本报告下方的测试与未覆盖列表仍按原批次记录，不把后续只读结果扩展为文档重建或 Gameplay 通过。

2026-11-06 补充：[七组 contracts 的 Windows 源码/独立包动态探针](WINDOWS_CONTRACTS_20261106.md)已完成；该批没有占用平板，也没有重新运行本报告的完整套件和基础 PC/GER。

2026-11-06 后续补充：[当前 TS 的真实 DoL 原生保存闭环](WINDOWS_TS_REAL_SAVE_20261106.md)已在新建空白 PC Profile / origin / Store 完成，生产 GER 派发一次、Effect 结清、独立读回一致。没有接触 Android；下方迁移前业务与本次新结果分别保留，不能合并成所有真实游戏路径均通过。

同日后续：[固定独立包的真实保存与 CLI 中断恢复](WINDOWS_PACKAGE_REAL_SAVE_RECOVERY_20261106.md)在另一新建空白 PC 环境通过。同一原 terminal 在新 CLI 恢复后结清，动作数仍为 1；未使用此前实验的 Profile / Store。

同日后续：[固定独立包原生导航及保存 Scope](WINDOWS_PACKAGE_NATIVE_NAVIGATION_20261106.md)在另一新建空白 PC 环境通过。窄 Scope 的受保护业务调用为 0，另建授权请求导航一次并结清；实际自动保存次数为 0，不冒充非零事务验收。报告末尾区分了无设备检查、实机/历史输入和额外覆盖。

同日后续：[真实 Windows 文件占用与生成器回滚](WINDOWS_FILE_LOCK_20261106.md)通过，G 套件扩为 Windows 6/6，Program 与 125 类型负例通过。没有修改生成器产品逻辑；此前清单中的真实句柄占用项现已关闭，最低 Windows Node 26.0.0 仍单列未验证。

同日后续：[系统 Node 更新与轻量兼容](WINDOWS_NODE_UPDATE_20261106.md)完成，当前默认 Node 26.13.0 LTS，68 项定向检查及 Program 通过；此前各批仍保留其原运行时版本。旧 MSI 子流程的 Restart Manager 关闭/重启记录和 UI 提前退出报告均保留，具体进程关联待核对；没有宣称并发零影响。最低 Windows 26.0.0 未因此通过。

同日 Android 后续：[真实文档替换与原账本只读核对](ANDROID_DOCUMENT_RESOURCE_20261106.md)已完成并释放平板。旧生产绑定拒绝新文档，显式新绑定可读；首轮 60 秒就绪失败与后续调整实验分开留证。原账本四条未决及全部记录保持，原生身份与登记值不一致、页面原回执缺失，未执行 Android 新业务或追认历史恢复成功。

## 来源与范围

最初接续 `01fe9fd478a770d71bcd63ec4e5cfaa6ebecd5dd`，形成 Windows 修复 `ff72553ba4ffa933abade391abd1b9b9c39f74d7` 和截图诊断/夹具补充 `f15f92199b7a9af0773a92af6b7dec435a1454c5`。随后获取远端 TS / 启动诊断基线 `8670318c3947ffd0496582c28c0dfc7ebc3e0074`，保留两条历史并安全合并。

**本批固定代码：`cd28b0aba280f986145378d2d5c86b4ee853b5a7`。** 后续本报告提交不改变受验代码。容量和诊断修复已迁入权威 `.cts`，CJS 由完整 Program 生成；没有拿旧 CJS 覆盖新迁移。包内版本仍为 6.1.0，7.0 为研发目标。

## Delivered

- 先关闭测试持有的 SQLite 连接，再删除临时目录；保留原 Runtime 断言。
- 源码查找测试使用目录 junction 验证不遍历链接；CRLF 夹具先规范化换行再构造 CRLF。原 source-finder 测试已被新构建测试入口取代，同一修正落实在 `tools/typescript/test/build.test.cts`。
- PC 夹具在 Windows 核对自有浏览器后正常关闭。身份不可确认时记录 `unconfirmed`，只终止自有 Node 子进程并解除管道引用，避免验证器永久等待。没有按名称批量结束 Chrome。
- 验包脚本用 `PurePosixPath` 解释 Git 路径，修正 Windows 上排除目录的误判。
- 真实游戏 HTML 为 83,141,230 字节，超过旧上限。仅入口 HTML 上限改为 128 MiB；附加资源仍为单项 64 MiB、合计 512 MiB，白名单和 loopback 约束不变。
- 为截图超时保留固定方法名 `Page.captureScreenshot`。没有改变超时、执行白名单、GER、权限、终态或旧 Unknown；远端新增的初始绑定诊断和冻结 JS 协议输入均保留。

## Validated：合并后的当前代码

实际环境：Windows build 26340.0、PowerShell 7.6.5、Node 26.12.1、npm 11.20.0、Python 3.14.9、Chrome 156.0.8078.80。下表均为本机本轮结果，没有混入 Mac / Linux 数量。

| 检查 | 本轮结果 |
| --- | --- |
| 完整 Program 生成和一致性 | 98 Node、17 DOM-only 模块及 133 产物匹配 |
| 类型负对照 | 原 117 项加新增 8 项，共 125 项按预期拒绝 |
| Windows 构建保护 | 5/5；包括漂移、CRLF、部分写入/回滚、peer 替换、锁和宿主全局隔离 |
| 源码 Node 套件 | 633 项：631 通过、0 失败、2 跳过 |
| 独立包 Node 套件，禁用 TS 擦除 | 同样 633 项：631 通过、0 失败、2 跳过 |
| Python 独立 venv | 10 项：9 通过、1 个可选 Pillow 项跳过 |
| 三种 F07 启动控制 | 普通启动、扣住首页响应、扣住脚本响应均符合原合同；PID/端口清理确认 |
| 源码和独立包 PC 无头 | 各 12/12 |
| 源码和独立包 GER | 各 13/13，中性原状态、SQLite、进程中断和原回执恢复 |
| 源码和独立包 Integration | 各 10/10，原文档、导航/重载/ABA、可选失败和 Generic 证据边界 |
| 独立包安装和 Runtime | 缺 XState 拒绝、锁定的包内 XState 5.33.2、SQLite 完整性/关闭重开、help/version、Skill 安装/resolver、两个独立 App Server 的发现通过 |

Node 的两个跳过项为 macOS 权限和非普通查询文件；Windows 文件占用用例实际执行。独立包在源码依赖树之外的中文空格路径解压，先确认没有可解析的 XState，再按锁安装。Skill 发现未启动模型 turn，也未替换全局安装。

固定 ZIP **431 文件**，CRC、export 集合和逐文件 Git blob 全部匹配，SHA-256：`62b95509df39b010602235922a275d32109000b53a1423bc1b34a599bf39a8da`。完整文件摘要见 [Windows 包清单](windows-package-manifest.json)。该 ZIP 只留本地，不是 Release 资产。

### 失败记录及处理

迁移前首轮 Node 为 513 通过、3 失败、2 跳过；两个清理失败及 symlink 权限问题已通过最小夹具修复处理。迁移后的新 G 测试首轮为 4 通过、1 个重复 CRLF 转换失败，修正权威 CTS 后为 5/5，漂移拒绝等断言保留。

独立包 PC 及后续 Integration 初轮均遇到多标签截图超时。协议追踪确认超时方法为 `Page.captureScreenshot`；保存动作的 ACK 和 DOM/CSS 已保留，没有重放该保存。两次简单后台截图对照未复现该问题，物理根因仍 Unknown。两个夹具现将同 URL 干扰页设为后台，原页/干扰页和文档失效断言保留，受控路径通过。**该调整不证明生产后台截图问题已修复**；生产采集不会自动抢焦点。Integration 首次只完成前三项、结果 partial，cleanup confirmed，仍保留原记录。

清理负例强制令 `stopServer` 读取记录失败，验证器退出 1，保存 failed / cleanup unconfirmed；事后记录的 Chrome 未存活，原端口无监听。独立只读复审指出过子进程引用可能挂住的问题，补修后未发现新增阻断；复审方没有独立重跑实验。

F07 的历史初始空文档原因也仍为 Unknown。当前控制通过只证明诊断和拒绝边界，未声称修复其物理根因。原始失败、setup 错误及私人输出均留在本地忽略目录。

## Validated：迁移前已经执行的真实现场

以下证据来自本批前半程、TS 合并前的 Windows 实现。它们保留原输入身份，**不计作新 TS 基线的真机通过**。

- **真实 DoL 0.5.12.13 / Lyra**：独立 Profile / origin，实际 SugarCube `2.36.1+34`。通用 Evidence、原生初始化控件、生产 GER 从 Start2 到 Orphanage Intro 已验证。首次导航因实验请求漏带可能发生自动保存的 Scope 而执行前拒绝，补齐用户已有授权范围后结清为 occurred；没有放宽权限。
- **原生 IDB 保存**：直接使用 `docs/recipes/dol-save-state.cjs` 和 save-only Scope。核对本 Session settled 操作见证、slot/metadata、独立状态和摘要后才写 required checkpoint，没有用初始即满足的状态冒充执行。
- **真实保存中断恢复**：仅在自有 CLI 的 CDP 返回边界暂扣已经收到的原 terminal，随后实际终止该进程。SQLite 保留 pending；独立 CLI `resume` 复用原 nonce/digest/terminal 结清，动作数仍为 1。原 slot 摘要保持，关闭浏览器后复用原 Profile / origin 仍读到同一存档。误用于活跃 Session 的停止态 `reconcile` 拒绝也保留，未修改该合同。
- **Android WebView**：获准平板 M367FC / Android 17、user 0；实际 StartConfig 0.5.12.13、Loader 2.101.1，GameVersion Mod 来源 unknown。真实 reload 改变 loader/timeOrigin，旧生产 holder 拒绝，显式新绑定观察成功；标准 Evidence complete，自己的 transport/forward 清理完成。首次脚本过早读取尚未就绪的 StartConfig 失败，后续只读观察确认原新文档完成加载，没有反复重载。受控 frame 副本缺 fragment 时，原生 history 回退可用，不等于真实旧 Provider 验收。
- **Kotlin Activity 探针**：Gradle 8.9、AGP 8.7.3、Kotlin 2.0.21、SDK 35 / Build Tools 34，实际 JDK 21.0.11 编译至 JVM 17。APK SHA-256 为 `a53f3bd4f4b48225cbd4cbf43e9c007e01b67b1b98b6cfda31fcb857438a17ed`。首次计数 0→2，用户确认额外手动点击一次；受控对照为 2→3。有效旋转中 process UUID 不变、Activity UUID 改变且非零计数 1 保持。已恢复原旋转设置、退出并卸载本轮自有探针。没有性能或设备代理结论。
- **真实源码查找**：干净的 0.5.11.9 候选树 `41993d3f32476f0b1c8db730c159a50ffcdc2a65`，衣柜 widget 定义 `game/base-clothing/wardrobes.twee:324`（候选上限 partial）、侧栏 `game/base-system/datetime-text.twee:17`、天气 `game/base-system/widgets.twee:1749` 均经独立 rg 对照。歧义保持 partial，无匹配为 complete/none。全仓固定 revision 查询因耗时未取得可交付结果，有效结果来自按区域选择的工作树；它与 0.5.12.13 版本不同，仍是候选资料。

## Not validated / Known limitations

- 本报告原批次合并 TS 后未重新操作 Android、真实 DoL / Mod 或历史 Store；后续只读 Android 和新空白 PC 原生保存结果见开头补充。未覆盖的其它设备 / 业务仍需按目标选择，UI P1 优先；不得用迁移前证据冒充新基线动态验证。
- 后台截图的具体物理触发原因、历史 F07 首败原因仍 Unknown。页面 readyState 或 idb.active 不证明游戏脚本全部就绪；读不到字段时保留 unknown。
- 尚未在精确 0.5.12.13 源码完成多区域现场对应；本批没有 Shop Buy / Wardrobe Wear、全剧情、全 Mod 组合或完整视觉验收。
- Kotlin 仅验证自有探针生命周期；设备代理、传输、持久业务提交和同任务性能对照未实现/验证。Bundle 计数不提供这些保证。
- 未覆盖其它设备/旧 WebView 实际协议、设备主动断连、PID 复用、真实历史 CRLF 回执和当前 Desktop 聊天热加载。历史 Unknown 未被改写、清除或追认。

本批可按上述 Windows 无设备接线与验包范围收口并同步测试分支。7.0 整体发布判断留待后续明确范围，不自动追加全设备矩阵，也不跳过当前真实证据缺口。接续入口为 [Windows 任务书](../../docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md)，后台截图说明见 [PC Runtime](../../docs/PC_RUNTIME.md#验证范围)。原始命令、失败、Profile、SQLite、设备标识和游戏材料保留于本地忽略的 `artifacts/windows-20261105/`，不上传。
