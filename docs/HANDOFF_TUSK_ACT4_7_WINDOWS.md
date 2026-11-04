# Paisley Park 7.0 TUSK ACT4 — Windows 接续任务书

日期：2026-11-04。接收方：家用 Windows 开发环境的 Codex。

**任务：接续当前研发分支，验证 Windows Chrome、真实 DoL 和 Android 行为，修复实际发现的问题，并给出下一步收口判断。Mac 接线已完成，不要重新开发另一套 Runtime；本任务书不是正式发布指令。**

## 1. 固定身份与读取顺序

| 对象 | 固定身份 |
| --- | --- |
| 仓库 | [102326/DoL-Dev-Tools-Paisley-Park](https://github.com/102326/DoL-Dev-Tools-Paisley-Park) |
| 研发分支 | [experiment/tusk-act4-7](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/experiment/tusk-act4-7) |
| 本次接续基线，含最终13场景脚本与交付报告 | `8863e65d59ad9c1b69a12187dcd642c12d200e4c` |
| GER / 标准 Evidence 主实现 | `5c132422889d2d3b28877bbf8d6ab19895edaf3c` |
| 最终生产代码及 Mac 独立包基线 | `eff14d6c8a4344ddbae844b2faf7e92896e38c72` |
| 上一轮 PC / Journey 接续基线 | `241c77262b560481447dff75903d679bb2fedc2e` |
| 正式 main，本次交接核对值 | `cfd76a75e6c28efbbdcf447b25679cd9f257ef54` |

固定源码：[接续树](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/8863e65d59ad9c1b69a12187dcd642c12d200e4c)。差异：[上轮接线 → 本次接续基线](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/241c77262b560481447dff75903d679bb2fedc2e...8863e65d59ad9c1b69a12187dcd642c12d200e4c)。

本任务书在上述基线之后提交；它不可能位于其自身所指的旧提交中。Windows 先核对最新远端与基线的差异，记录**实际运行的完整 SHA**，不要把本页中的 SHA 当成永远不变的远端 HEAD。若远端仅增加交接文档，可从确认后的最新研发分支接续；存在新代码时先检查改动及其验证记录。

按需读取：

1. `AGENTS.md`、主 Skill `.agents/skills/dol-dev-tools-paisley-park/SKILL.md`。
2. [Mac GER / Evidence 报告](../experiments/tusk-act4-7/ger/REPORT.md)、[验证摘要](../experiments/tusk-act4-7/ger/validation-results.json)、[逐文件包清单](../experiments/tusk-act4-7/ger/package-manifest.json)。
3. [PC_RUNTIME](PC_RUNTIME.md)、[GAMEPLAY](GAMEPLAY.md)、[PROJECT_EXPERIMENTS](PROJECT_EXPERIMENTS.md)、[EVIDENCE_TOOLS](EVIDENCE_TOOLS.md)。
4. 源码调查读 [GAME_SOURCE](GAME_SOURCE.md)；设备工作读 [DIAGNOSTICS](DIAGNOSTICS.md)、[WORKSHOP](WORKSHOP.md) 与 [Android 探针说明](../experiments/tusk-act4-7/android/README.md)。
5. 发布包核验读 [RELEASE_PACKAGE](RELEASE_PACKAGE.md)。此前 ACT4 私有历史仓库仅为历史依据，**当前命令和测试不依赖取得该旧仓库**。

## 2. 已交付、已验证与未验证

已交付 PC 本地资源白名单 HTTP、独立可见/无头 Chrome、明确选页/重绑、Debug Action/Journey、共享 GER Goal/Session、标准 Evidence、Chrome Environment Compare / Known Good、源码查找和 Android 生命周期探针源码。

Mac 实际环境：macOS 27.0.1 ARM64，Chrome 156.0.8078.73，Node 26.13.0 与最低版本26.0.0，Python 3.9.6，Codex CLI 0.166.0-alpha.6。

| Mac 证据 | 实际范围 |
| --- | --- |
| Node 全套 | 518项：517通过、0失败、1项Windows专属句柄行为跳过 |
| Python | 10项：9通过、1项可选Pillow缺失跳过 |
| 独立包 GER / Evidence | 最低Node26.0.0，真实Chrome，13/13；**自建状态/Recipe/公共元数据** |
| 独立包原PC流程 | 12/12；覆盖选页、重绑、资源更新与保留进度 |
| 恢复 | 真正终止派发CLI后，SQLite保留pending，原terminal恢复，购买只一次；停止后reconcile不续期、不完成Goal |
| 回执容量 | 65条其它标签历史+1条当前记录先RED后GREEN；保留原66 Session回归 |
| 归档及安装 | eff14d6包319文件逐一对应Git blob；独立安装、resolver、宿主skills/list发现通过 |
| CI | [eff14d6](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41800367209) 与 [8863e65](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41801537480) 成功；CI是Linux证据 |

**Not validated：Windows Chrome、Android SDK/APK/设备/WebView、真实 DoL/Mod/存档与原生业务 profile、真实多区域源码检索质量、当前 Desktop 聊天热重载。** Mac 的合成状态 API 不是游戏源码，Recipe 的通过不证明真实游戏 profile 已支持。

Chrome optional Integration 当前明确不执行：worker 尚不能保持相同文档绑定。通用采集继续可用；这是已说明的能力边界，不因“optional”自动要求本轮全部实现。

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
$Baseline = '8863e65d59ad9c1b69a12187dcd642c12d200e4c'
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

先做这一阶段，再打开真实游戏。输出目录必须是新的；旧失败、Profile和pending留存。PC脚本使用18767（无头）/18768（可见），GER使用18771–18775；确认端口可用，**串行运行**，不要为占用端口杀未知进程。

```powershell
npm test
npm ci --prefix experiments/weather-report-20261104/source-finder --ignore-scripts --no-audit --no-fund
node experiments/weather-report-20261104/source-finder/build.cjs --check
node experiments/weather-report-20261104/source-finder/check-types.cjs
node --test experiments/weather-report-20261104/source-finder/test/build.test.cjs

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
} finally {
    $env:PAISLEY_TOOL_ROOT = $SavedToolRoot
}
```

前面的独立命令也逐项检查退出码与结果，不以最后一条成功覆盖早先失败。Python使用独立venv，按CI的固定 `jsonschema==4.25.1`、`rfc3339-validator==0.1.4` 安装测试依赖，再执行 `python -m unittest discover -s tests -p 'test_*.py'`；Pillow当前为可选，缺失跳过要记录。不要在本机测试依赖缺失时伪报通过。

重点核验：

- Windows原先跳过的句柄测试实际执行；Node/Python的通过/失败/跳过分别列出，不硬要求Mac相同数量。
- 路径空格、Unicode资源、可见/无头、origin/Profile保留、重新绑定与同URL干扰标签、进程退出和端口释放。
- GER13场景尤其SIGKILL后的真实Windows终止语义、SQLite/WAL与句柄、报价拒绝pending=false、原terminal恢复一次、停止后reconcile不续期/不完成Goal、旧文档拒绝与跨Session围栏。
- Evidence manifest、目标身份、DOM/CSS/事件/存储/环境/截图/性能，以及缺元数据unknown、Known Good双向比较与不支持项。

实验脚本是Mac已跑通的复现入口，**尚不是Windows通过保证**。Windows终止信号/文件占用等差异要区分“夹具编排问题”和“产品合同缺陷”；修复可移植编排后保持相同业务断言，不用固定sleep或重复点击补齐未知结果。`paused/exhausted/failed` 状态CLI可能按既有合同退出1；先读结构化结果，不改退出语义。

**W1完成：** Windows上的核心夹具实际通过或有明确可复现阻断；所有失败/跳过如实保留。没有设备不阻止继续PC工作。

## 6. W2 — 真实 DoL / Mod 的 PC 代表性验收

在获准的家用环境使用独立测试副本、明确授权测试档和资源。先确认游戏版本/构建、Mod组合、原生profile匹配情况、资源加载与当前场景；不要使用日常Chrome Profile或正式存档。按 [PC_RUNTIME](PC_RUNTIME.md) 的资源清单与 `pc-start` 创建HTTP实例，不把整个目录开放。

| 任务 | 必须观察的结果 |
| --- | --- |
| 页面/资源/版本识别 | 实际浏览器页面、游戏与Mod加载标识对应所选输入；资源摘要不代替加载结果 |
| 普通Debug与标准Evidence | 能定位真实控件/问题、取得有界现场和证据；可选Integration unsupported不能被写成已支持 |
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

Mac eff14d6 ZIP摘要为 `a0b80e12428ab9bb1c60ac1cd3f8fa92088367df59ff6901065c0eea668ea7d1`，它不是GitHub Release资产，也不要求跨机复制。**从8863e65或后续提交重建的ZIP不应期待相同摘要**；逐文件manifest按其原提交对应，不能挪用到新包。

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
