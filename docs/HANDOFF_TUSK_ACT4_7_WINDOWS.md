# Paisley Park 7.0 TUSK ACT4 — Windows 接续任务书

更新：2026-11-06。接收方：家用 Windows 开发环境的 Codex。

**任务：接续当前研发分支，验证 Windows Chrome、真实 DoL 和 Android 行为，修复实际发现的问题，并给出下一步收口判断。本任务书不是正式发布指令。**

## 7.0 发布时统一更名（用户决定，2026-11-06）

- 正式项目名称：**DoL Dev Tools — Gold Experience（黄金体验）**。Paisley Park 保留为历史项目代号，不再作为新一代核心平台的正式名称。
- 定位：为 Agent 提供深入 DoL 的能力，让其能够观察、理解、操作、调查和验证游戏。项目理念：**创造能力，赋予行动。**
- 用户确认在 **7.0 发布收口时**统一更名，检查 README、Skill、CLI 对外说明、发布文案及制品展示名称的一致性；当前先记录决定，不立即改代码、包名、仓库名、路径或版本。
- 历史版本与验收记录保留当时名称及证据身份。内部标识和路径按实际兼容需要处理，不因更名自动迁移；本记录不授权合并主线或发布。

Windows 后续状态（2026-11-06）：已完成的范围见 [Windows 接续记录](../experiments/tusk-act4-7/WINDOWS_REPORT.md)、[新 TS Android 只读复验](../experiments/tusk-act4-7/ANDROID_TS_READONLY_20261105.md)、[七组 contracts 补验](../experiments/tusk-act4-7/WINDOWS_CONTRACTS_20261106.md)与[新 TS 真实 DoL 原生保存](../experiments/tusk-act4-7/WINDOWS_TS_REAL_SAVE_20261106.md)。最后一项使用新建空白 PC 环境，生产 GER 保存一次并结清，不触碰 Android 或历史 Store。下方“尚待 Windows”的描述保留原 Mac 交接时点；已完成项按对应固定代码和报告去重，不自动重跑。最低 Node26.0.0 的 Windows 运行、真实历史回执及其它真实游戏业务仍有未覆盖范围，不能据这些代表性结果宣布整体7.0可发布。

同日新增：[固定独立包的真实保存与原回执恢复](../experiments/tusk-act4-7/WINDOWS_PACKAGE_REAL_SAVE_RECOVERY_20261106.md)已通过。新建空白 PC 环境执行唯一保存，在原 terminal 返回边界实际中断自有 CLI，新 CLI 恢复同一 attempt 并结清，动作数仍为 1。没有占用平板或操作历史 Store；保留中断和清理首轮未确认记录。

同日新增：[固定独立包原生导航及保存 Scope](../experiments/tusk-act4-7/WINDOWS_PACKAGE_NATIVE_NAVIGATION_20261106.md)已通过：窄 Scope 零受保护业务调用，另建 navigation/save 请求原生导航一次并结清；本次实际自动保存计数为 0。后续验收按该报告末尾清单区分无设备、实机/历史输入与额外覆盖，不自动扩大全游戏矩阵。

同日新增：[真实 Windows 文件占用与生成器回滚](../experiments/tusk-act4-7/WINDOWS_FILE_LOCK_20261106.md)已通过。新增真实 FileShare.None / Read 用例，完整 G 套件 Windows 6/6；生成器产品逻辑未改。历史 G5 的注入/协作锁证据保留，新结果单列，不改写旧通过范围。最低 Windows Node 26.0.0 仍待新运行时输入；本轮没有下载或切换 Node，也未操作 Android。

同日后续：[系统 Node 更新与兼容记录](../experiments/tusk-act4-7/WINDOWS_NODE_UPDATE_20261106.md)。用户随后选择更新现有 Node：当前默认 26.13.0 LTS / npm 11.20.0，68 项定向检查和 Program 通过，最低 26.0.0 仍未验证。旧 MSI 嵌套卸载实际调用 Restart Manager，具体 UI 提前退出的 PID/时间关联仍待核实；后续更新须协调所有相关动态任务停稳。未改开发包版本或操作 Android。

同日 Mac 继续开发：[固定 revision 源码查找修复](../experiments/tusk-act4-7/source-find/REPORT.md)。已安全同步 Windows 基线 `8a0b4263f10dd3804f0eefcd7218c06641689664`；新代码 `a8ac74bd14eb8155aed1e528ada49539bedf0cf9` 把逐文件 Git 内容读取改为有界批量，保留原 commit、预算和 partial 合同。合成 512 文件的结果一致，Git 调用 1,029→9；源码及最低 Node26.0.0 独立包各 33/33 定向测试。收口发现并修正 Git 缺失对象大小为 BAD 时的误过滤，新增真实 loose blob 缺失回归；初轮 d5b3c58 不能作为最终基线。工具自身固定 commit 的 796 文件查询完整通过。真实游戏全仓和 Windows 新 Git 路径尚待补验，不解除 Android 原资源身份/四条 pending 的既有边界，也不改此前真实平台记录。

完整Node核心TS迁移已完成本机Scoped Done；开发包P2，UI4.2优先级P1。95个原入口全部strict（含9源码载体），另17DOM-only源、21冻结JS输入共46函数体未类型化，运行清单133项。G另3个开发入口，Node Program98项/总133生成产物。详见[完整Mac收口](../experiments/tusk-act4-7/typescript/CLOSEOUT_MAC.md)。Windows/Android/真实游戏已通过上列代表性验收，其余未覆盖范围保留，不能称整体7.0可发布。先读[TS迁移进度](../experiments/tusk-act4-7/typescript/PROGRESS.md)、[首批报告](../experiments/tusk-act4-7/typescript/BATCH_AB.md)和[C01报告](../experiments/tusk-act4-7/typescript/BATCH_C01.md)，再按实际最新提交安排Windows验证。

## 1. 固定身份与读取顺序

| 对象 | 固定身份 |
| --- | --- |
| 仓库 | [102326/DoL-Dev-Tools-Paisley-Park](https://github.com/102326/DoL-Dev-Tools-Paisley-Park) |
| 研发分支 | [experiment/tusk-act4-7](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/experiment/tusk-act4-7) |
| **最新 Mac 固定代码，含有界 revision 源码查找修复** | **`a8ac74bd14eb8155aed1e528ada49539bedf0cf9`** |
| 本次同步的 Windows 基线，含截至此时的实机接续与更名决定 | `8a0b4263f10dd3804f0eefcd7218c06641689664` |
| 既有完整Node核心/G及config一致性修复、F07诊断代码 | `93facebe38a81ecbe2b6e2d9976ed92ef45b5926` |
| TS A+B代码及对应独立包 | `0196e86989facae13e765dc3bff58046b53502a7` |
| Chrome optional Integration固定代码 | `bd3f1b61798552953c27ec0066280169c3f61da3` |
| typed Skill resolver 固定代码及对应包 | `10082eff5715e26f086d19310f815c22872b9dfe` |
| 上一次完整Windows接续任务书 | `6a6fb273e619fe5dc6d99713482b9927f1ea5f8f` |
| 上轮 Windows 交接文档 | `01fe9fd478a770d71bcd63ec4e5cfaa6ebecd5dd` |
| GER / Evidence 最终13场景脚本与交付报告 | `8863e65d59ad9c1b69a12187dcd642c12d200e4c` |
| GER / 标准 Evidence 主实现 | `5c132422889d2d3b28877bbf8d6ab19895edaf3c` |
| GER阶段生产代码及对应 Mac 独立包基线 | `eff14d6c8a4344ddbae844b2faf7e92896e38c72` |
| 上一轮 PC / Journey 接续基线 | `241c77262b560481447dff75903d679bb2fedc2e` |
| 正式 main，本次交接核对值 | `cfd76a75e6c28efbbdcf447b25679cd9f257ef54` |

固定源码：[接续树](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/a8ac74bd14eb8155aed1e528ada49539bedf0cf9)。C01差异：[A+B → CDP/IPC](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/f4316cccdcb1eb68d85639c669366bd287223d37...eb8e13ad4e5ac2d1b6b10f03714a94041b339b49)。最近TS差异：[开工 → A+B](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/18544c8d1cb2a751130bf023cfc37b531ed6b722...0196e86989facae13e765dc3bff58046b53502a7)。差异：[上轮接线 → 本次代码基线](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/241c77262b560481447dff75903d679bb2fedc2e...bd3f1b61798552953c27ec0066280169c3f61da3)、[最近交接 → Chrome Integration](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/6a6fb273e619fe5dc6d99713482b9927f1ea5f8f...bd3f1b61798552953c27ec0066280169c3f61da3)。

本任务书在上述基线之后提交；它不可能位于其自身所指的旧提交中。Windows 先核对最新远端与基线的差异，记录**实际运行的完整 SHA**，不要把本页中的 SHA 当成永远不变的远端 HEAD。若远端仅增加交接文档，可从确认后的最新研发分支接续；存在新代码时先检查改动及其验证记录。

按需读取：

1. `AGENTS.md`、主 Skill `.agents/skills/dol-dev-tools-paisley-park/SKILL.md`。
2. [Mac GER / Evidence 报告](../experiments/tusk-act4-7/ger/REPORT.md)、[验证摘要](../experiments/tusk-act4-7/ger/validation-results.json)、[逐文件包清单](../experiments/tusk-act4-7/ger/package-manifest.json)。
   [typed Skill resolver 验证报告](../experiments/tusk-act4-7/typed-skill/REPORT.md)及[固定10082ef包清单](../experiments/tusk-act4-7/typed-skill/package-manifest.json)；最新 [Chrome Integration 报告](../experiments/tusk-act4-7/integration/REPORT.md)及[固定bd3f1b6包清单](../experiments/tusk-act4-7/integration/package-manifest.json)。旧报告包身份按原提交保留，不替换历史证据。
3. [PC_RUNTIME](PC_RUNTIME.md)、[GAMEPLAY](GAMEPLAY.md)、[PROJECT_EXPERIMENTS](PROJECT_EXPERIMENTS.md)、[EVIDENCE_TOOLS](EVIDENCE_TOOLS.md)。
4. 源码调查读 [GAME_SOURCE](GAME_SOURCE.md)；设备工作读 [DIAGNOSTICS](DIAGNOSTICS.md)、[WORKSHOP](WORKSHOP.md) 与 [Android 探针说明](../experiments/tusk-act4-7/android/README.md)。
5. 发布包核验读 [RELEASE_PACKAGE](RELEASE_PACKAGE.md)。此前 ACT4 私有历史仓库仅为历史依据，**当前命令和测试不依赖取得该旧仓库**。

## 2. 已交付、已验证与未验证

已交付 PC 本地资源白名单 HTTP、独立可见/无头 Chrome、明确选页/重绑、Debug Action/Journey、共享 GER Goal/Session、标准 Evidence、Chrome Environment Compare / Known Good、源码查找和 Android 生命周期探针源码。

Mac 实际环境：macOS 27.0.1 ARM64，Chrome 156.0.8078.73，Node 26.13.0 与最低版本26.0.0，Python 3.9.6，Codex CLI 0.166.0-alpha.6。

| Mac 证据 | 实际范围 |
| --- | --- |
| 最新 Node 全套，93facebe | 632项：631通过、0失败、1项Windows专属句柄行为跳过 |
| 完整TS Mac收口 | 95原入口（9源码载体）+3开发入口+17DOM/133产物，21冻结输入共46函数未类型化；125负例、5构建；当前两套Node各631通过/1跳过；源码GER13、最低Node包Integration10和两套启动控制各3组通过；完整TS原批记录见[完整报告](../experiments/tusk-act4-7/typescript/CLOSEOUT_MAC.md) |
| TS F11 | 60Node+8DOM/77产物，9冻结输入共23函数未类型化；106类型负例、5构建、60定向及最低Node包、独立18项；真实合成IndexedDB源码/包各5项与恢复冲突负对照，见[F11报告](../experiments/tusk-act4-7/typescript/BATCH_F11.md) |
| TS F10 | 57Node+8DOM/74产物，另6冻结输入共11函数未类型化；99类型负例、5构建、52定向及最低Node26包、独立10项；源码/最低Node26包真实Chrome闭包/控件读取各6项，见[F10报告](../experiments/tusk-act4-7/typescript/BATCH_F10.md) |
| TS F09 | 55Node+8DOM/72产物，另5冻结输入共10函数未类型化；94类型负例、5构建、48定向及最低Node26包、独立17项；mapping原请求/attest/receipt/quote/cleanup对照通过，见[F09报告](../experiments/tusk-act4-7/typescript/BATCH_F09.md) |
| TS F08 | 53Node+8DOM/70产物，另3冻结输入共7函数未类型化；89类型负例、5构建、26定向及最低Node26包、独立9项；20种旧准备帧/摘要对照，最低Node26包Chrome GER13通过。原生购买/衣柜的真实业务未验证，见[F08报告](../experiments/tusk-act4-7/typescript/BATCH_F08.md) |
| TS F07 | 51Node+8DOM/68产物，另2冻结输入共3函数未类型化；84类型负例、5构建、30定向及最低Node26包、独立17项；源码/最低Node26无钩子真实Chrome各6项。两次绑定前空文档超时保留、原因未定，不能宣称启动稳定性已修复，见[F07报告](../experiments/tusk-act4-7/typescript/BATCH_F07.md) |
| TS F06 | 50Node+8DOM/67产物、80类型负例、5构建；13定向/最低Node26包、独立7项，源码/最低Node26包真实回执维护各8与GER各13，全套568过/1Windows跳过；见[F06报告](../experiments/tusk-act4-7/typescript/BATCH_F06.md) |
| TS F05 | 49Node+7DOM/64产物，77类型负例、5构建；66定向/最低Node26包、独立Scope/资源12项、源码/最低Node26包Chrome GER各13/13，全套565过/1Windows跳过；见[F05报告](../experiments/tusk-act4-7/typescript/BATCH_F05.md) |
| TS C06 | 目标实际克隆身份与键一致，正常固定哈希保持；16定向/最低Node26包通过、源码PC12+GER13、最低Node26包GER13；全套561过/1Windows跳过，见[C06报告](../experiments/tusk-act4-7/typescript/BATCH_C06.md) |
| TS F04 | 47Node+7DOM/62产物，74类型负例、5构建；77定向/最低Node26包通过，克隆后验证回归；源码/最低Node26包真实Chrome状态条件各8/8，全套559过/1Windows跳过；见[F04报告](../experiments/tusk-act4-7/typescript/BATCH_F04.md) |
| TS F03 | 46Node+6DOM/59产物，71类型负例、5构建；61定向/最低Node26包通过，falsy失败40组合；源码/最低Node26独立包真实Chrome闭包各7/7；全套556过/1Windows跳过，见[F03报告](../experiments/tusk-act4-7/typescript/BATCH_F03.md) |
| TS F02 | 45Node+5DOM/56产物，另1个JS协议输入/2函数未类型化；固定原LF render摘要、Git换行属性、CRLF负对照与40定向/最低Node26包通过；全套553过/1Windows跳过；见[F02报告](../experiments/tusk-act4-7/typescript/BATCH_F02.md) |
| TS F01 | 44Node+5DOM/55产物，66类型负例、5构建；19定向及最低Node26包19/19，全套551过/1Windows跳过、源码Chrome GER13/13；见[F01报告](../experiments/tusk-act4-7/typescript/BATCH_F01.md) |
| TS E09 | 41Node+5DOM/52产物，63类型负例、5构建；40定向、551项550过/1Windows跳过；源码/最低Node26独立包GER各13/13，环境旧对照通过；见[E09报告](../experiments/tusk-act4-7/typescript/BATCH_E09.md) |
| TS E08 | 40Node+4DOM/49产物，61类型负例、5构建；19定向及最低Node26包19/19，全套548过/1Windows跳过；见[E08报告](../experiments/tusk-act4-7/typescript/BATCH_E08.md) |
| TS E07 | 37Node+4DOM/46产物，58类型负例、5构建；7合成定向与最低Node26包均通过，549项548通过/1Windows跳过；见[E07报告](../experiments/tusk-act4-7/typescript/BATCH_E07.md) |
| TS E06 | 34Node+4DOM/43产物，55类型负例、5构建；78定向、548项547通过/1Windows跳过；源码Integration10+GER13、最低Node26独立包78定向及Integration10通过，manifest身份投影回归；见[E06报告](../experiments/tusk-act4-7/typescript/BATCH_E06.md) |
| TS E05 | Journey/ChromeEvidence，33Node+4DOM/42产物，52类型负例、5构建；70定向/20等待旧对照，源码ChromePC12+GER13、最低Node26无依赖包PC12；见[E05报告](../experiments/tusk-act4-7/typescript/BATCH_E05.md) |
| TS E04 | Action类型/派发来源合同，31Node+3DOM/38产物，48类型负例、5构建；52定向、五种派发源码旧对照、独立审查15过，源码/最低Node26包GER13/13；见[E04报告](../experiments/tusk-act4-7/typescript/BATCH_E04.md) |
| TS E03 | 30Node+3DOM/37产物，44类型负例、5构建；源码/最低Node26固定包Support/SVG/兼容入口12/12；见[E03报告](../experiments/tusk-act4-7/typescript/BATCH_E03.md) |
| TS E02 | 26Node+3DOM/33产物，41类型负例、5构建；源码/最低Node26包安装与入口31过/1Windows跳过；Doctor门槛已对齐26，见[E02报告](../experiments/tusk-act4-7/typescript/BATCH_E02.md) |
| TS E01 | 23Node+3DOM/30产物、40类型负例、构建5/5；源码及最低Node26固定包采集/媒体替身测试32/32，不代替ADB/录屏或真实媒体验收；见[E01报告](../experiments/tusk-act4-7/typescript/BATCH_E01.md) |
| TS D02 | 19Node+3DOM/26产物，37类型负例、构建5/5；29定向、源码/最低Node26无依赖独立包PC12/12；见[D02报告](../experiments/tusk-act4-7/typescript/BATCH_D02.md) |
| TS D01 | 18Node+2DOM独立Program/23产物，36类型负例，构建5/5；源码ChromeIntegration10+GER13，源码树外最低Node26包GER13/13；见[D01报告](../experiments/tusk-act4-7/typescript/BATCH_D01.md) |
| C05启动准备修复 | 同一endpoint只读发现超时在原期限内等待，其它错误不重试；故障注入3/3、源码/最低Node26包PC12/12。首次超时物理根因未知，不宣称硬实时期限 |
| TS C04 | 共享Collector/隐私/文件归属接入，16模块/17产物，32类型负例、构建4/4；Chrome首跑发现超时未抹除，串行诊断及最低Node26包10/10；见[C04报告](../experiments/tusk-act4-7/typescript/BATCH_C04.md) |
| TS C03 | 启动/HTTP/宿主记录/输入选路接入，当前13模块/14产物，30类型负例；源码与最低Node26包PC12/12；见[C03报告](../experiments/tusk-act4-7/typescript/BATCH_C03.md) |
| TS C02 | 宿主/执行上下文接入，当前9模块/10产物，26类型负例；源码Chrome GER13/13，最低Node26独立包Integration10/10；见[C02报告](../experiments/tusk-act4-7/typescript/BATCH_C02.md) |
| TS C01 | CDP/IPC/worker共3模块接入，当前7模块/8产物，22类型负对照；伪造worker元数据严格拒绝，最低Node26包Chrome10/10 |
| TS A+B | 4个strict模块/5产物、14类型负对照、4构建保护通过；目标key与诊断旧CJS对照一致 |
| Chrome optional Integration | 真实Chrome10/10；源码Node26.13.0和独立包最低26.0.0均通过。含worker连接前hash往返RED/GREEN、关闭原页不接干扰页、单次挂起及10秒总时限保护 |
| typed resolver / 安装 / 源码查询定向 | 43项：42通过、1项Windows跳过；构建保护3/3、8个类型负对照全部被拒绝 |
| Python | 10项：9通过、1项可选Pillow缺失跳过 |
| 独立包 GER / Evidence | 最低Node26.0.0，真实Chrome，13/13；**自建状态/Recipe/公共元数据** |
| 独立包原PC流程 | 12/12；覆盖选页、重绑、资源更新与保留进度 |
| 恢复 | 真正终止派发CLI后，SQLite保留pending，原terminal恢复，购买只一次；停止后reconcile不续期、不完成Goal |
| 回执容量 | 65条其它标签历史+1条当前记录先RED后GREEN；保留原66 Session回归 |
| 最新归档及安装，0196e86 | 320文件逐一对应Git blob，不含CTS/MTS与开发构建包；最低Node26.0.0禁用类型剥离，help/version/安装/resolver/source-find及10项Chrome通过。Skill文件未改，复用10082ef宿主发现证据 |
| CI历史接线基线 | [bd3f1b6](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41963804264)成功；原[10082ef](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41962097547)、[eff14d6](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41800367209)与[8863e65](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41801537480)亦成功；CI是Linux证据 |

**Not validated：Windows Chrome、Android SDK/APK/设备/WebView、真实 DoL/Mod/存档与原生业务 profile、真实多区域源码检索质量、当前 Desktop 聊天热重载。** Mac 的合成状态 API 不是游戏源码，Recipe 的通过不证明真实游戏 profile 已支持。

Chrome optional Integration 的原实现缺口已在bd3f1b6关闭：worker复用ChromeHost不可变绑定，主连接前后检查保留其失效事件，10秒总时限覆盖全部检查。模块失败仍为可选失败，已成功Generic制品保留。只有中性模块在Mac验过；内置桥及真实Mod API需要实际detect/collect，不能由入口支持推断其已验收。Android原Contract 1顺序采集语义未变。

上一增量改Skill位置解析器及开发构建检查：`resolve.cts`是权威源，安装时仍只复制预生成`resolve.cjs`；成功JSON与环境覆盖规则保持，新增有限code/stage/hint，拒绝空版本和畸形JSON。最新增量接入可选Integration，不改GER/Store/Unknown，也不要求普通用户安装TS。普通Debug仍无需安装XState。Windows需额外核验下列resolver入口、生成器文件占用/换行及Integration文档/worker生命周期行为。

## 3. 续接权限与不可改变的合同

- 可按本计划排查、必要修复、运行隔离测试，提交并同步原研发测试分支。保留可比较基线，不覆盖另一台电脑的未提交工作或别人新增提交。
- 不自动合并 main、创建 PR、Tag、Release、改正式版本号或删除分支。包元数据目前仍为6.1.0；7.0是研发目标，不能声称已正式发布。
- 先探测 Windows，优先 PowerShell 7。不假设项目路径、Node/Chrome/ADB/SDK版本、设备或游戏已就绪；安装和设备操作遵循实际已获授权的环境，不改全局策略、日常 Profile 或私人数据。
- Chrome Session 固定原 live browser/target/document，不重读 host-file 自动接受新文档。TargetKey在**同一Store内覆盖整个Profile**，跨标签/origin/浏览器实例也保留原pending。换Store不是隔离证明；不能迁移Android或旧文档Unknown到新页面。
- Profile路径/资源摘要不是数据世代或独立存档证明。Chrome不伪造Android nativeIdentity/resourceGeneration。新绑定只服务新任务，不结清旧attempt。
- 预算、fencing、完整Decision/actionRef、执行对象/上下文、原receipt nonce/contract/digest、独立Outcome继续有效。点击/ACK不等于业务成功；未知不补点。普通Debug不强制GER，受保护动作只由一个协调器派发。
- 不通过清pending、删回执、换失败语义、放松源码指纹或绕过安全检查取得通过。只回收已可靠持久结算且属于当前执行上下文的回执。
- 原始Profile、SQLite、存档、截图、设备序列号、日志、官方工具原始输出留本地。仅上传审查脱敏后的源码/报告；不需要把Mac原始artifacts搬过来才能开工。

## 4. W0 — 同步、环境与基线

已有目录先执行 `git status --short --branch`、`git remote -v`、`git log -1`，检查已暂存/未暂存/未跟踪内容；脏工作区使用新克隆或独立worktree。禁止reset --hard、clean、强推或丢弃现有工作。

在用户选择的个人研发父目录中，新目录克隆示例：

```powershell
git clone --branch experiment/tusk-act4-7 https://github.com/102326/DoL-Dev-Tools-Paisley-Park.git Paisley-Park-Tusk7
Set-Location .\Paisley-Park-Tusk7
$Baseline = 'eb8e13ad4e5ac2d1b6b10f03714a94041b339b49'
git remote get-url origin
git fetch origin
git merge-base --is-ancestor $Baseline HEAD
if ($LASTEXITCODE -ne 0) { throw '当前工作线不包含交接基线，请先核对来源。' }
git diff --stat "$Baseline..HEAD"
$RunCommit = git rev-parse HEAD
$PSVersionTable.PSVersion
git --version
node --version
npm --version
```

确认origin确实为目标仓库。若分支分叉或远端变化，检查关系并安全合并，不以覆盖历史处理。记录实际Windows版本/架构、工具路径与版本即可，不必公开用户名、主机名等身份信息。

要求Node >=26.0.0。先使用已有合规安装，不为此修改全局Node配置。Chrome示例路径需实际检查；读取文件版本不启动日常浏览器：

```powershell
$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $Chrome -PathType Leaf)) { throw '请核对实际安装的Chrome可执行文件路径。' }
(Get-Item -LiteralPath $Chrome).VersionInfo.ProductVersion
npm ci --ignore-scripts --no-audit --no-fund
node .agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
```

核对 `DOL_DEV_TOOLS_HOME`、`PAISLEY_TOOL_ROOT` 是否指向旧包，避免表面运行当前仓库、实际操作另一工具根。需要覆盖时仅限本次终端/子进程，结束恢复原值，不改全局。resolver证明位置，不证明宿主发现或加载正确。

**W0完成：** 工作树/来源明确、实际运行SHA已记、Node/Chrome及根依赖可用、工具根已核对。

## 5. W1 — Windows 无内容夹具与现有合同

先做这一阶段，再打开真实游戏。输出目录必须是新的；旧失败、Profile和pending留存。PC脚本使用18767（无头）/18768（可见），GER使用18771–18775，Integration使用18776及动态回环控制端口；确认端口可用，**串行运行**，不要为占用端口杀未知进程。

TS后续合成探针见各批报告：`contracts/business-bindings-verify.cjs`使用18780，`contracts/control-verify.cjs`使用18781，`contracts/save-observer-verify.cjs`使用18782，`contracts/probes-verify.cjs`使用18783（完整路径在`experiments/tusk-act4-7/`下）；参数均为明确Chrome可执行文件与全新输出目录。它们是实验脚本，Windows尚待验证，不是正式跨平台CLI，也不证明真实游戏来源profile已验收。失败时保留日志/Profile，不改变目标或清理Unknown。

```powershell
npm test
npm ci --prefix tools/typescript --ignore-scripts --no-audit --no-fund
node tools/typescript/build.cjs --check
node tools/typescript/check-types.cjs
node --test tools/typescript/test/*.test.cjs

New-Item -ItemType Directory -Force artifacts | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$SavedToolRoot = $env:PAISLEY_TOOL_ROOT
try {
    $env:PAISLEY_TOOL_ROOT = (Get-Location).Path
    node experiments/tusk-act4-7/pc/verify.cjs $Chrome "artifacts/windows-pc-headless-$Stamp" headless
    if ($LASTEXITCODE -ne 0) { throw 'PC headless未通过，保留输出并诊断。' }
    node experiments/tusk-act4-7/pc/verify.cjs $Chrome "artifacts/windows-pc-visible-$Stamp" visible
    if ($LASTEXITCODE -ne 0) { throw 'PC visible未通过，保留输出并诊断。' }
    node experiments/tusk-act4-7/ger/verify.cjs $Chrome "artifacts/windows-ger-$Stamp"
    if ($LASTEXITCODE -ne 0) { throw 'GER/Evidence未通过，保留输出并诊断。' }
    node experiments/tusk-act4-7/integration/verify.cjs $Chrome "artifacts/windows-integration-$Stamp"
    if ($LASTEXITCODE -ne 0) { throw 'Chrome Integration未通过，保留输出并诊断。' }
} finally {
    $env:PAISLEY_TOOL_ROOT = $SavedToolRoot
}
```

前面的独立命令也逐项检查退出码与结果，不以最后一条成功覆盖早先失败。Python使用独立venv，按CI的固定 `jsonschema==4.25.1`、`rfc3339-validator==0.1.4` 安装测试依赖，再执行 `python -m unittest discover -s tests -p 'test_*.py'`；Pillow当前为可选，缺失跳过要记录。不要在本机测试依赖缺失时伪报通过。

重点核验：

- Windows原先跳过的句柄测试实际执行；Node/Python的通过/失败/跳过分别列出，不硬要求Mac相同数量。
- Skill resolver实际安装后只依赖CJS，使用`node --no-strip-types INSTALLED_RESOLVER`核对六个成功字段和所选工具根；畸形元数据/缺文件/失效覆盖按有限code/stage拒绝，无私人路径回显。生成器的CRLF、类型漂移、部分写入、权限/回滚、协作锁和已观察未知文件保留由4项构建测试验证；Windows的目标文件占用与rename行为尚未实测，失败应保留旧CJS，不放宽完整性或改用运行时TS。
- 路径空格、Unicode资源、可见/无头、origin/Profile保留、重新绑定与同URL干扰标签、进程退出和端口释放。
- 检查browser-abi协议资产及固定oracle确为LF；运行原摘要断言，不能让新旧一起转成CRLF而掩盖不同合同。历史CRLF checkout回执保留原身份，用原兼容基线恢复或记录拒绝，不能重算摘要后结清旧pending。
- 合成源码证明可运行 `node experiments/tusk-act4-7/contracts/verify.cjs ABS_CHROME NEW_OUTPUT`（实验脚本，Windows尚待实际执行）；确认真实V8闭包与group释放，falsy故障使用合同测试复现，不把合成Widget当真实DoL。
- 合成Goal条件可运行 `node experiments/tusk-act4-7/contracts/goal-proof-verify.cjs ABS_CHROME NEW_OUTPUT`（Windows尚待实跑）；它只验证自写State/DOM stand-in，实际游戏必须另做原回执/库存/支出佐证。
- 合成回执容量维护可运行 `node experiments/tusk-act4-7/contracts/receipt-verify.cjs ABS_CHROME NEW_OUTPUT`（Windows尚待实跑）；它构造自写页面终态，不能替代真实业务的提交/Outcome证据。
- GER13场景尤其SIGKILL后的真实Windows终止语义、SQLite/WAL与句柄、报价拒绝pending=false、原terminal恢复一次、停止后reconcile不续期/不完成Goal、旧文档拒绝与跨Session围栏。
- Evidence manifest、目标身份、DOM/CSS/事件/存储/环境/截图/性能，以及缺元数据unknown、Known Good双向比较与不支持项。
- Integration固定原Profile/browser/target/document；连接前hash往返、detect→collect刷新、redact导航、原页关闭均不能混代成功。迟到前检查不启动worker，后检查仍受同一总时限；模块缺失/失败不丢Generic，挂起不重复调用。源码单元包含这类deadline断言，不把worker终止理解成远端取消。

实验脚本是Mac已跑通的复现入口，**尚不是Windows通过保证**。Windows终止信号/文件占用等差异要区分“夹具编排问题”和“产品合同缺陷”；修复可移植编排后保持相同业务断言，不用固定sleep或重复点击补齐未知结果。`paused/exhausted/failed` 状态CLI可能按既有合同退出1；先读结构化结果，不改退出语义。

**W1完成：** Windows上的核心夹具实际通过或有明确可复现阻断；所有失败/跳过如实保留。没有设备不阻止继续PC工作。

## 6. W2 — 真实 DoL / Mod 的 PC 代表性验收

在获准的家用环境使用独立测试副本、明确授权测试档和资源。先确认游戏版本/构建、Mod组合、原生profile匹配情况、资源加载与当前场景；不要使用日常Chrome Profile或正式存档。按 [PC_RUNTIME](PC_RUNTIME.md) 的资源清单与 `pc-start` 创建HTTP实例，不把整个目录开放。

| 任务 | 必须观察的结果 |
| --- | --- |
| 页面/资源/版本识别 | 实际浏览器页面、游戏与Mod加载标识对应所选输入；资源摘要不代替加载结果 |
| 普通Debug与标准Evidence | 能定位真实控件/问题、取得有界现场和证据；可选Integration按目标API实际检测/采集，unsupported/unavailable不能写成Mod已支持 |
| Action/Journey代表性交互 | 动作确实派发，游戏自身状态与DOM一致；失败后可定位阶段 |
| 一项受保护业务GER | 当前Decision→报价/预算→原控件/函数绑定→独立Outcome，实际花费/库存/状态正确；不只看ACK |
| 多标签/刷新/hash/导航/断连 | 不误选页面；原文档仍在时按原合同继续，换文档时旧Session拒绝且pending保留 |
| 副作用前后中断与恢复 | 区分零派发、已发生、未知；原attempt结果恢复，不重复购买/操作 |
| 保留进度与存取（按授权需要） | 同Profile/origin及实际加载版本明确，已确认测试档存取正确；换端口不误报丢档 |

若当前真实游戏的源码/函数指纹不匹配，记录实际差异，针对现有Provider作有依据的修复并加定向验证；不得关闭attestation、伪造receipt或退回普通点击后补记成功。优先一个代表性的完整闭环，不追加全游戏/全Mod矩阵。

记录一次真实任务的工具调用、人工介入、主要耗时及失败后接续成本，指出真实卡点；不要从合成场景数量推导“普遍提效”。

## 7. W3 — 全游戏范围的实用源码查找

按 [GAME_SOURCE](GAME_SOURCE.md) 确认官方入口、现场游戏版本、所查分支/commit；按需使用源码，不把游戏源码打包进Skill/工具，也不强制常驻Stable/dev两份副本。

至少调查商店之外的**衣柜、侧栏、另一类不同界面或逻辑**。组合Passage、Widget/宏、文字、选择器、事件、符号、路径线索，记录实际候选文件/行/上下文、歧义、未找到原因与人工搜索对照。版本无法精确对应时明确标候选资料，不冒充当前实现。

重点看动态文字、翻译、宏展开/Mod覆盖、长行Unicode上下文是否仍有实用卡点；有证据再补轻量结构处理/索引，不把完整Source Link 2.0或跨版本影响分析变成这轮门槛。

## 8. W4 — Android 旧能力定向回归与 Kotlin 取舍

先检查现有ADB、Java、Gradle、SDK、设备与工具实际版本/帮助；明确选定serial/package/测试数据范围。不读取其它设备或私人数据，不自动安装大工具集。SDK/APK工作已分配Windows，Mac没有执行或验收。

两条工作线分开记录：

1. **既有Android/WebView回归：** 原serial/package/user身份、App/Activity/WebView生命周期、CDP frame/loader/完整URL/context、Action/Journey、标准Evidence、GER预算/fencing/原receipt、旧Session及native数据代次。特别复验fragment缺失时浏览器history回退、hash变化旧holder失效、历史停止/过期Session只读reconcile。只覆盖本次接线可能影响的合同和代表业务。
2. **Kotlin真实设备原型：** 从 [Android README](../experiments/tusk-act4-7/android/README.md) 构建独立探针。当前项目固定AGP8.7.3、Kotlin2.0.21、SDK35、JDK17、Gradle8.9；没有wrapper JAR。先核对可信现有工具和适用许可，缺失时按用户实际授权处理，不把无编译当成功。安装到选定自有测试设备后，验证进程/Activity身份、人工单次递增、旋转重建与计数恢复。

该探针目前**没有设备代理、后台任务或传输**，Bundle计数不是持久业务效果；不要把一次UI dump当成设备代理提速结论。后续选择有价值的设备侧等待/批量观察/操作场景，在同设备同任务对照ADB/WebView，记录准备成本、响应、信息量、失败和人工介入，取得采用/混合/调整/撤回的实际依据。Kotlin采用本身不是发布条件；若这轮只能完成部署/生命周期，准确保留结论与下一步，不虚构代理能力。

## 9. W5 — Windows 独立包、安装与宿主发现

来源和源码夹具分开：发布ZIP按 `.gitattributes` 排除实验，所以Windows同时保留源码工作区供复现，`PAISLEY_TOOL_ROOT` 指向独立解压工具包供实际运行。解压目录不能复用源码node_modules。

本次最新固定Mac包来自`93facebe38a81ecbe2b6e2d9976ed92ef45b5926`，431文件，ZIP摘要`df3003d9425dee1e292088ad6657ea5b65ac998c8618dda8d664877142d52a6e`，[清单](../experiments/tusk-act4-7/startup/package-manifest.json)。以后以最新批次固定提交/manifest为准，不挪用此包摘要。历史C01包来自固定`eb8e13ad4e5ac2d1b6b10f03714a94041b339b49`，321文件，ZIP摘要`9f063b6285ad782cdf0e2e3c16324602b63e9b60ef32c57d945121032f800bea`，[清单](../experiments/tusk-act4-7/typescript/package-c01-manifest.json)。A+B原包记录保留。原bd3f1b6 Integration包的321文件和摘要仍在其原报告中保留。原10082ef包及eff14d6包在各自报告中保留原身份。它们都不是GitHub Release资产，不要求跨机复制。**从后续文档提交重建ZIP不应期待相同摘要**；逐文件manifest按其原提交对应，不能挪用到新包。

用实际选定的完整SHA、新输出名重新归档，避免Windows换行转换：

```powershell
$PackageCommit = git rev-parse HEAD
$Zip = "artifacts/windows-package-$Stamp.zip"
git -c core.autocrlf=false -c core.eol=lf archive --format=zip --prefix=Paisley/ --output=$Zip $PackageCommit
Get-FileHash -Algorithm SHA256 -LiteralPath $Zip
# NEW_EXTRACT_DIRECTORY须替换为尚不存在的目录；脚本来自源码工作区
python experiments/tusk-act4-7/verify-package.py $PackageCommit $Zip NEW_EXTRACT_DIRECTORY
```

`verify-package.py`用Git `check-attr --source`核对导出集合；Git版本不支持时记录并处理工具前提，不跳过逐文件验证冒称通过。新manifest和原包都保留，原始输出先落本地，审查后再上传必要摘要。

按 [RELEASE_PACKAGE](RELEASE_PACKAGE.md) 验证白名单/字节/锁文件/版本身份、全新目录中的help/version、缺XState拒绝及按锁安装、核心CLI、Skill安装/resolver、文档链接与已有数据保留。通过源码夹具+`PAISLEY_TOOL_ROOT`重跑必要PC/GER合同。

宿主发现可复用 `experiments/weather-report-20261104/host-discovery/probe.cjs REVIEWED_ZIP`，选择实际已安装Codex CLI（需要时设置本轮 `PAISLEY_CODEX_BIN`）。这是待验证的跨平台脚本，失败要检查Windows进程/stdio/路径；不要改为只跑resolver便认定宿主发现通过。Mac只证明独立App Server的skills/list，Windows应实际确认安装、forceReload/宿主重启发现；当前聊天热重载另记。不得为验货覆盖全局Skill或清空用户配置。

## 10. 修复、同步与交付

每个实际问题先复现并定位，再修最小必要接缝；运行风险相称的检查，复用未失效的Mac证据。保持轻量CI，不为本轮搭建新验证平台、Provider Framework或第二套Runtime。

提交前审查本批文件及将推送历史，尤其artifacts、Profile、SQLite、存档、设备信息、原始截图/工具输出、SDK归档、凭据和私人路径。Codex作者和提交者使用 `Codex` / `199175422+chatgpt-codex-connector[bot]@users.noreply.github.com`，用命令级身份、不改用户全局Git设置；核对提交元数据及推送后远端显示。分支远端必须为本仓库；只在可安全快进时更新，不强推。普通步骤无需逐项停下汇报，具体阻断及时说明。

在现有实验记录下保留Windows报告（例如 `experiments/tusk-act4-7/WINDOWS_REPORT.md`），至少写清：

- 实际环境、分支、完整运行SHA及相对交接基线的修复提交。
- Delivered / Validated / Not validated / Known limitations；Node/Python/Chrome/Android/真实游戏各自证据，不合并成总测试数。
- 失败、跳过、恢复现场、设备与数据授权范围；原始私有证据本地保存位置仅作本地索引。
- 代表业务状态、预算、未决效果与回执恢复；源码多区域实际候选和检索质量；Kotlin取舍依据。
- 独立包来源SHA/摘要/逐文件manifest、安装与宿主发现、远端最终引用。
- 本次Windows约定范围是否Scoped Done、7.0尚有哪些实际实现缺口/必要验收、哪些只是额外覆盖。

**停止条件：** 约定的Windows代表场景通过，实际问题已修且必要合同有证据；未能完成的设备/业务项目明确保留，不伪造验收、不无限追加矩阵。依据结果提出7.0收口建议；合并main、版本改号、Tag与Release等待用户另行指示。


## 本次新增交接边界（完整TS Mac收口）

固定代码与逐文件manifest见本页顶部和完整报告。源码与独立包均无正在运行的本机必要检查；本机迁移实施完成，Windows接手重点转为真实平台验收，不重复迁移95个入口。先检查本地未提交工作和远端分叉，再同步实验分支；不reset/clean/force。

Runtime config新增真实临时SQLite回归，拒绝直接JS API的toJSON/getter放宽预算或扩展/丢失scope；普通JSON不变。可达条件不是常规JSON CLI远程输入。用户决定随7.0交付，不另发6.1补丁。street/profile清理现在保留falsy主异常与cleanup异常；不意味着旧Unknown可结清。

优先复验Windows Chrome启动/原目标、G的文件占用/rename/LF与最低Node；Android环境再测原serial/package/用户/Socket/生命周期/输入与真实回执。原native-passage-8128aafb01db仍是无save旧合同，不按新save权限或新Hash解释。真实历史CRLF收据保留原输入身份；不以本次LF规范自动重签。

F07初始空文档PC_DOCUMENT_CHANGED仍未解决，原失败保留。本轮四组Chrome成功不证明首次启动可靠性问题已修。真实DoL/Mod/源码只在有授权的适用环境获取；不使用私人Profile/Store验货。


## F07诊断后续：同步后停止

最新固定代码与包清单已更新至本页顶部。[本批报告](../experiments/tusk-act4-7/startup/REPORT.md)。新增初始绑定有限reason、被动HTTP进度和尽力创建的startup-failure.json；保留PC_DOCUMENT_CHANGED、原5秒初始等待、目标/绑定/Unknown语义。既有绑定失效不会被误当作初始就绪。头部响应被扣住时能安全拒绝并保留进度；脚本被扣住时可在原绑定区分脚本就绪。

历史两次F07物理根因仍Unknown，本批没有新的自然首败；不得把控制重现或通过运行写成已修根因。journal缺失/不完整时保留原证据，不自动重启、重导航或清pending。服务响应完成不证明页面提交，也不是业务零副作用证据。

本批全部本机必要检查结束后提交并同步、实际确认CI，然后停止等待用户回家；不开始下一批、不自动发布或单独补丁6.1。


## 2026-11-06 Mac 后续授权

上节“同步后停止”是上一批 F07 工作的已履行停止条件。用户随后授权先同步最新 Windows 进展、继续本机可做的开发并同步研发分支。本轮只处理有证据的固定 revision 查询卡点；不因此重开无边界重构、Android 原 Store 操作或正式发布。最新代码、包清单、测量和剩余验收见本页顶部源码查找报告。
