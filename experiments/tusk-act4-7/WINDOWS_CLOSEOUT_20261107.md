# 7.0 Windows 接续收口

2026-11-07（Asia/Shanghai）。**Windows 接续约定范围达到 Scoped Done，可进入 7.0 发行收口准备。** 当前没有本轮范围内尚需补写的生产能力；原目标的数据恢复阻挡和未定根因仍在下文单列。版本、名称、正式包、main 合并和发布按原任务书仍等待另行指示；本结论不是正式 7.0 发布批准。

本页汇总当前依据，取代旧交接快照作为 Windows 待办入口；各次实验仍保留原 SHA、环境、失败和数量。不能把下列复用结果改写为今天全部重跑，也不把它们相加为产品能力数。

## Delivered

完成 Windows Chrome 接线、共享 GER/Evidence/Integration、生成器与文件占用、真实 DoL 代表保存/导航、Android 文档与原回执边界、准确版本源码查询及 Kotlin 取舍。过程中发现的实际问题已按对应报告修正：Windows 夹具清理/路径、生成保护、源码查询隐式 Git 抓取、旧 Goal 缺失 Store 的空库创建，以及 Journey deadline 测试时序。

保留原系统 Node 更新及其并行任务影响记录。没有以重跑通过追认 F07、截图超时或数据身份差异的物理根因。没有为了完成工具任务恢复已解决的历史 Mod Bug、遍历全部游戏，或创建新 Runtime/Ledger/权限服务。

| 工作线 | 当前结论与有效证据 |
| --- | --- |
| W1 平台与离线合同 | **Completed，覆盖有限。** [Windows 基础验收](WINDOWS_REPORT.md)含源码/独立包各 633 项（631 通过、2 跳过）和 Python 10 项（9 通过、可选 Pillow 1 跳过），保留 Node 26.12.1 与原固定输入。后续共用 Goal/Resource/CLI 78/78、Journey 16/16，以及新包接缝补验分别记录，不冒充完整 Windows 666 项重跑。 |
| W1 编译与 Windows 句柄 | **Completed。** 98 strict Node、17 DOM、133 生成产物与 125 类型负对照有有效证据；[真实文件共享锁/回滚](WINDOWS_FILE_LOCK_20261106.md) Windows G 6/6，不把协作锁或注入当作 OS 文件占用。 |
| W2 Chrome 与受控接线 | **Completed。** 既有源码/包 PC 12、GER 13、Integration 10，以及[七组真实 Chrome 合同](WINDOWS_CONTRACTS_20261106.md)各保留范围；[后续启动清理](WINDOWS_FOLLOWUP_20261106.md)源码/包各 43/43。下节另补当前包的 GER 13 项。 |
| W2 真实 DoL 代表业务 | **Completed，覆盖有限。** [真实保存](WINDOWS_TS_REAL_SAVE_20261106.md)、[固定包保存与原回执恢复](WINDOWS_PACKAGE_REAL_SAVE_RECOVERY_20261106.md)、[原生导航及 Scope 拒绝](WINDOWS_PACKAGE_NATIVE_NAVIGATION_20261106.md)成立。保存只执行一次，恢复原 attempt；导航实际自动保存事务为 0，未写成非零保存通过。 |
| W3 源码查找 | **Completed，覆盖有限。** [当前精确上游与有界查询](WINDOWS_FOLLOWUP_20261106.md)确认官方 0.5.12.13 commit，衣柜/侧栏/另一类逻辑候选已独立核对；新增无隐式抓取边界，源码/包各 36 通过、1 平台跳过。全仓达到预算或缺对象仍为 partial，不冒充运行中的 Lyra/汉化/Mod 正文逐字对应。 |
| W4 Android | **Completed，覆盖有限。** [只读与标准 Evidence](ANDROID_TS_READONLY_20261105.md)、[真实文档更换与旧绑定拒绝](ANDROID_DOCUMENT_RESOURCE_20261106.md)、[独立真实 App 原生保存与原回执恢复](ANDROID_INDEPENDENT_RECOVERY_20261107.md)已覆盖代表接缝，原目标历史数据另列。 |
| W4 Kotlin 取舍 | **Completed。** [同机状态与生命周期对照](ANDROID_SNAPSHOT_COMPARISON_20261107.md)支持保留原型、生产继续 Android CLI/ADB/CDP；未证明真实 DoL 收益，不接入 helper，不成为发行阻断。 |
| W5 独立包与发现 | **Completed，覆盖有限。** 原 [Windows 验收](WINDOWS_REPORT.md)已验证锁定依赖、SQLite、CLI、隔离 Skill 安装/resolver 及两个独立 App Server 发现。当前原 resolver/安装源未变，复用发现证据；本次新包另核对字节、依赖、resolver 和共享 GER。没有替换全局 Skill或声称当前聊天热加载通过。 |

## Validated：本次新增包接缝

| 对象 | 固定输入与实际结果 |
| --- | --- |
| 工具包源码 | `a9dc4bc9a91a84f95d790089338db9e3002491f6`；不是本页后续文档提交重建的 ZIP。 |
| Windows / Node / Chrome | Windows 10.0.26340.0、PowerShell 7.6.5、Node 26.13.0；新自有 Chrome 实际报告 `Chrome/156.0.8078.81`。此前 .80 的结果仍保留原版本。 |
| 固定 ZIP | 432 文件，CRC、export 集合、逐文件 Git blob 全部匹配；SHA-256 `93b1dc7b3b6f4047fe9cfd5da1da19746b3398e78afacbf896b6c3e732b8ba36`。 |
| 隔离与依赖 | 源码树外新目录；清除外部 NODE_PATH/NODE_OPTIONS，执行锁定的 `npm ci --offline --ignore-scripts --no-audit --no-fund`，只安装包内 XState 5.33.2。实际解析在包内，不借源码依赖；没有下载新框架或改全局环境。 |
| CJS 执行 | 新包生产入口与依赖、父验证器及八处 CLI 子进程入口均显式 `--no-strip-types`。resolver 定位新包，版本仍为 6.1.0；版本元数据按原授权在发行阶段处理。 |
| 共享 GER / Evidence | 原中性业务 13/13：正常副作用结清、报价变化零远端派发、对象/URL 身份、真实 CLI 中断后原 terminal 恢复、停止后 reconcile、不重放、换文档保留 pending、跨 Session 围栏、标准 Evidence 与 Known Good。它们是合成原状态，不是新的真实游戏通过数。 |
| 清理与原件 | 两次独立夹具合计记录的 10 个浏览器根 PID 均退出，HTTP/CDP 端口无监听。运行后 432 个原件字节未变；Tusk/Android 实验没有进入包。自有 Profile/Store 保留本地，不清除其中刻意制造的未决。 |

首次新包运行已通过 13 项，但审核发现验证器只对父进程禁用类型剥离，没有把参数传给 CLI 子进程；它不能单独证明全链显式禁用。仅修正实验脚本 `ger/verify.cjs` 的八处子进程参数（`9094e08`），使用新的独立夹具输出再跑 13/13，保留首次结果。验证器被 export-ignore，工具包生产字节没有因此变化；没有修改 Action/GER、放宽权限或重放真实操作。

相关首败仍沿用其原报告：旧初始化 Journey、后台原 App CDP 复查超时、原生身份差异、旧账本缺失、`uiautomator` 137、CI deadline 时序。CI 的原失败运行保持失败；改测试时序后新的固定提交通过，不重跑旧 run 到绿。本轮不重复不受影响的本地完整 Node/Python或实机动作。

## Not validated / 后续覆盖

- Windows 最低 Node 26.0.0：用户选择更新至 26.13.0，不安装旧便携版；不将 Mac/Linux 最低版本结果计为 Windows 通过。没有擅改 engines。
- 更多游戏业务、Mod/包装 App/WebView/设备组合、非零导航自动保存、完整 Android Mod 自主修复与设备侧生产代理：后续按实际目标或风险验证，不自动成为 Remaining work。
- 真实历史 CRLF receipt 跨构建恢复、其它停止 Session：只有取得原输入且存在实际兼容要求时再验，不重算旧摘要或改合同结清。
- 当前聊天热加载、7.0 全局安装、最终版本/名称与正式发布包：没有执行，属于下一步发行操作及其对应验收，不是已经完成的事实。

## Known limitations：原目标数据与物理根因

原默认 Store 仍缺失，原因 Unknown。找到的 95 Effect/generation 4 备份保留四条旧未决，却不是最后 99 Effect/generation 5 的完整账本；不恢复或提升为最新库，不伪造缺失记录。原目标的接续业务保持阻挡；独立 App 代表性验收完成不解除这个阻挡。原六槽存档最新内容也没有因后台复查超时而被确认。

这属于具体旧目标的数据恢复缺口，不应写成“通用 Gameplay 或整个工具未实现”。旧 Goal 缺失/空 Store 的打开前拒绝已修复并验证；它不是并发外部删除锁，也不能自动发现所有新 Goal 背后的遗失历史。操作约束仍需保持。

历史 F07、截图超时、原生 stat device 差异和 `uiautomator` 137 的物理原因未定。安全拒绝、保留证据和代表性成功有各自范围，不能追认根因已修。系统 Node 更新曾影响并行任务的记录保留；本次没有再次运行安装程序。

## 接续与发行边界

当前 W1–W5 没有需要为“更完整”追加的实现或无限回归。下一步如进入正式 7.0 发行收口，按已记录决定统一 **DoL Dev Tools — Gold Experience（黄金体验）** 的对外名称、版本、README/Skill/CLI/发布说明，生成绑定最终源码的正式包，再按实际发行要求验收。该步骤尚未开始；本页不授权版本改号、替换全局安装、合并 main、Tag 或 Release。

原始命令、锁安装日志、两次中性 Store/Profile、完整 ZIP manifest 和清理证明留在本地忽略目录 `artifacts/windows-closeout-20261107-184204/` 及其记录的树外解压目录。公开摘要只包含环境、身份和边界；不上传原始 Store、存档、截图、游戏或私密路径。按既有授权只同步测试分支。
