# DoL Dev Tools: Paisley Park

Paisley Park 是面向 DoL Mod 作者和 Agent 的本地开发工具，提供 Android / WebView 现场诊断、源码与制品核验、Mod 兼容性调查，以及可接续的研究经验。它帮助你从运行问题找到相关源码，核对构建包与实际加载结果，并用证据比较修改前后。可以独立使用，也可以由宿主 Agent 调用。

**6.1.0 — White Snake** · [下载](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.1.0) · [安装与升级](docs/SKILL_INSTALL.md) · [更新说明](docs/RELEASE_6.1.0.md) · [支持范围](docs/CLOSEOUT_6_1.md)

它不承诺自动修复所有 Mod、全平台兼容或完整自主游戏 Agent。宿主 Agent 负责判断，工具提供调查、执行和验证依据。

## 为什么需要 Paisley Park

当问题出现在设备上，只看源码或构建日志往往不够。你还需要核对当前界面、运行状态和实际加载的包。你可以用 Paisley Park：

- 检查界面错位、控件命中、Console 异常和 Mod 加载状态。
- 用 Action/Journey 复现已审阅的步骤，保留失败和前后证据，比较修改结果。
- 连接目标项目自己的源码、构建和部署流程，确认设备实际加载的包。
- 核对框架注册、缓存采用、依赖与补丁目标，结合实际执行证据调查兼容问题；优先复用上游已有功能。
- 从类似问题的研究经验中选择方法，重新核对版本、适用条件和反例，再继续调查。
- 在授权范围内推进受支持的游戏目标，中断后继续，并读取原游戏状态确认结果。

已有标准能力足够时优先使用；需要更灵活的调查时，可以直接使用 CDP、ADB 或项目测试。按当前问题选择工具，不要求每次走完整管线。

## 快速开始

初次使用建议从诊断、现场采集和 Evidence 开始，需要时再接入 Skill 与 Agent 工作流。无需先理解全部内部机制。

### 1. 解压并确认版本

从 [6.1.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.1.0) 下载 `DoL-Dev-Tools-6.1.0.zip`，核对随附的 SHA-256 后解压到长期保留的新目录。升级时保留旧 Tools、Skill 和执行记录，确认新版本可用后再切换。页面自动生成的 Source code 是源码归档；首次使用请下载上面命名的工具包。

需要 **Node.js 22.12+**。在 Tools 根目录运行：

```powershell
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
```

版本输出应为 `6.1.0`，help 首行以 `DoL Dev Tools 6.1.0 — White Snake` 开头。`Paisley-Park.cmd` 仍可使用；其它平台使用 `node scripts/dol-dev.cjs`。

### 2. 连接已授权的 Android App

需要已有 ADB、USB 调试授权、明确的设备 serial 和 App package。先打开目标 App；读取 WebView 内部还需要 App 开启调试支持。ADB 不在 PATH 时，在当前进程将 `DOL_ADB` 设为已有 `adb.exe` 的绝对路径，见 [连接说明](docs/DIAGNOSTICS.md#快速入口)。

替换下面的设备与包名占位符，然后运行：

```powershell
New-Item -ItemType Directory -Path artifacts -Force
.\Paisley-Park.cmd doctor --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/doctor.json
.\Paisley-Park.cmd capture --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/screen-001
# 需要 WebView 结构、Console、网络等证据时：
.\Paisley-Park.cmd evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-001 --scope '#passages'
```

先读 Doctor 的具体结果。它不会修复环境或启动游戏，`complete` 也不单独证明目标 WebView 可用。输出文件或目录必须尚不存在，重复采集换新名称。通用诊断无需 npm 依赖；工具包不捆绑游戏、APK、ADB 或 Android CLI。

### 3. 让 Agent 使用 Skill

需要Agent工作流时，在Tools根目录安装Skill；普通诊断、源码调查、Skill安装和resolver无需先装npm依赖：

```powershell
.\Paisley-Park.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

仅当任务使用Gameplay时，再在实际Tools根目录安装锁定依赖：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
```

安装器拒绝覆盖已有 Skill。更新时先备份并移出旧安装，保留原 Tools，再向空目录安装；Tools 必须留在稳定位置。Node 22 直接运行 Gameplay CLI 需要 `--experimental-sqlite`，Windows launcher 已包含。详细步骤见 [安装指南](docs/SKILL_INSTALL.md)。

安装后按宿主支持的方法刷新或开启新会话，确认 Skill 确实被发现；文件安装和 resolver 成功不保证下一回合自动可用。发现后显式使用 `$dol-dev-tools-paisley-park`，告诉 Agent 工作区、设备、App、问题或目标，以及获准操作的数据范围。例如：

> 检查已授权测试 App 中这个界面的布局问题，先确认实际加载的 Mod，再找到相关源码。只修改有证据指向的部分，使用项目已有方式构建和复验。

宿主 Agent 负责理解现场与决策，Tools 负责执行、记录与结果核验。持续游戏目标使用共享 Gameplay Runtime（GER）；普通只读调查或点击无需新建 Goal。支持的目标、预算和恢复步骤见 [Gameplay 指南](docs/GAMEPLAY.md)。

## 核心能力

Android CLI、Chrome Inspect/CDP 和 ADB 负责设备与运行现场；Source Link 和 Skill/Recipe 帮助接到源码与后续开发：

| 入口 | 你能看到什么 |
| --- | --- |
| Android CLI | 真机画面、标注截图与原生布局 |
| Chrome Inspect / CDP | WebView 内部的 DOM、Computed Style、Console、异常、Network、Storage 摘要与 Performance |
| ADB | Android / App 的日志、进程、内存、帧统计和生命周期 |
| Source Link | 可选的组件源码关联，当前只覆盖选定商店 Toolbar |
| Skill / Recipe | 帮助 Agent 按问题选择工具、接续调查依据与未确认结果 |

Chrome Inspect/CDP 是 Agent 进入真实 WebView 的桥梁，可以读取当前控件、样式和页面状态，结合截图与系统日志调查问题。通用诊断可用于原版、内容、框架、UI 和管理器 Mod，不要求安装某个特定 Mod 或 UI Runtime。

## 6.1 新增内容

- 验证更贴合当前改动：输入没有变化的有效证据可以复用，该补的证明仍要补。工具位置可按条件复用，设备和页面身份继续重新核对。详见 [开发流程](docs/DEVELOPMENT_FLOW.md#验证选择与停止)。
- 重构时按需比较状态、回调次数与顺序、异常和副作用，说明哪些行为要保持、哪些缺陷要修。随包的 [Hook 生命周期案例](examples/behavior-preservation/README.md)展示了“最终数字相同，回调却多执行一次”的区别；输入须另行取得并审查，不包含第三方 Mod。
- 补强配方检查：CE 验证器检查完整输出成员，并尊重指定 Python；Patch 观测保留初始资源选择，等待摘要时使用单调时钟，不受系统时间回拨影响。

这些改进使用现有Skill和项目测试，不增加Runtime或通用行为等价引擎，也没有证明所有任务普遍加速。

## 6.0 已有能力

White Snake 将 Mod 专业研究、兼容性调查、按需执行观测和经验接续接到既有开发流程：

- **框架机制研究与能力复用**：按问题查阅注册、缓存采用、依赖声明、补丁目标检查和消费者构建方法，先确认上游已提供什么能力。见 [研究与经验入口](docs/MOD_KNOWLEDGE.md)。
- **兼容性调查与定向修复**：结合源码、调用和实际加载结果，区分可选依赖误报、共享修改目标与真实故障。已有 [可选框架探测修复](docs/knowledge/cheat-optional-framework.md)和 [共享目标共存对照](docs/knowledge/shared-caption-coexistence.md)；同一目标被多个 Mod 修改，不等于发生冲突。
- **按需 Patch 观测**：显式选择研究对象，记录修改与发布阶段的内容指纹、漏采、未决及恢复状态，接入已有 Evidence。见 [观测配方](examples/patch-provenance/README.md)。需要审查后启用，不会默认安装探针，也不提供全量冲突判定。
- **跨会话经验接续**：按问题检索有版本条件的知识，保留反例和未知项。独立新会话已经自行找到案例，并重建出与实机所用版本一致的修复包；不能把历史结论直接套用到新版本。

研究对象的具体名称、固定版本、来源与验证边界保留在专业参考和案例中，见 [6.0 支持范围](docs/CLOSEOUT_6_0.md)。第三方 Mod、游戏资源和私人现场记录不随包分发。

## 保留能力

5.1 校正命令和文档、按任务整理 Skill、改善已知错误与安装失败恢复，并明确普通 Integration 的顺序观察边界。Windows 补验修复了 Node 22 下安装器对自有临时文件的误判。实际环境与覆盖范围见 [维护记录](docs/MAINTENANCE_5_1.md)和 [Windows 验收](docs/WINDOWS_5_1.md)。以下 5.0 能力继续保留：

| 能力 | 当前用途与范围 |
| --- | --- |
| UI Source Link | 将选定组件关联当前源码，首轮支持商店 Toolbar；源码变动、缺输入或未知组件保留对应状态 |
| Vite Component Lab | 用于已接入 UI 工程的组件开发和预览，可编辑真实 Vue 组件并热更新；由 UI 工程维护，不包含在 Tools ZIP，不代表游戏内热替换、自动部署或业务验证 |
| Skill / Recipe 接续 | 按问题关联现场、源码、构建与实际加载的包，同版本号仍核对字节；诊断可以独立交付，无需制造补丁 |

4.0.1 的自主 Debug、受支持 Gameplay、可选消费额度、执行回执和恢复能力继续保留。5.0 未改写 GER、SQLite 或历史 Unknown 的合同。更多入口见 [5.0 使用说明](docs/PAISLEY_PARK_5_0.md)。

## 当前验证范围

6.1 的 [Windows 补验](docs/WINDOWS_6_1.md)包括 Node 完整回归 449 通过、1 跳过，最低 Node 22.12 定向检查 48 通过、1 跳过，Python 8 通过、1 项可选 Pillow 跳过；均无失败。真实 CE 原包的完整字节及 16 项表达式检查、中文/空格路径、独立包安装与新会话项目 Skill 发现均有实际记录。

6.0 已有真实 Android 上的消费者加载、可选框架探测修复前后与原组合相关入口验证；共享目标的带/不带探针对照、真实 Chrome 发布夹具和独立会话经验应用分别保留证据边界。这些是既有6.0证据，不计为6.1新实机验证。当前支持范围见 [6.1 收口](docs/CLOSEOUT_6_1.md)，正式包验货以随附 `validation.json` 为准。

未改动的安装与执行行为复用 [5.1 Windows 验收](docs/WINDOWS_5_1.md)：Node 24 完整套件 429 项通过、1 项跳过；Node 22.12 定向检查 24 项通过、1 项跳过。两个 Windows 启动器、NTFS 中文/空格路径、真实文件占用和新进程 Skill 发现有对应记录，不外推所有宿主或文件系统。

源码关联与 Component Lab 保留 5.0 的有限原型验收（A/B），现场、源码和制品的接续保留代表性只读验证（C）。既有 Android 证据包括页面身份、受支持的存档操作、自动保存和受控购买；本轮未重新执行设备或真实游戏测试。详细时段与复用范围见 [5.0 收口](docs/CLOSEOUT_5_0.md) 和 [4.0 技术记录](docs/CLOSEOUT_4_0.md)。

## 已知限制

已验证的兼容修复案例由主会话完成平板部署与相关入口复验；独立新会话完成了经验发现与同摘要包构建，未独立部署设备。完整无人接管的 Android Mod 修复闭环、案例涉及的全部功能及更多组件、设备、Provider 和 Mod 组合未验证。Lab 回调、构建成功、包已加载与游戏业务通过是不同证据。

Integration 缺失、不支持或失败会单独记录，已成功的通用采集仍可保留。Integration 是经审查的本地代码，Worker 用于故障隔离，不是权限沙箱；Evaluator 可以执行传入的页面 JavaScript，“只读”是 Probe 和工作流约束。

操作存档、覆盖、删除或数据重建必须属于用户实际授权。已授权范围内自主推进，结果未知的动作保留原记录，不盲重放，也不通过换 Store 隐藏。使用数据重建前一致备份执行记录；升级后的 Store 不允许 3.0.3 继续写入，见 [升级提醒](docs/CLOSEOUT_4_0.md#数据重建与旧记录)。

截图、日志、存档和私人原始证据不自动上传。Evidence 的 complete / partial / failed 描述一次采集；像素差异不能单独证明兼容失败，内存增长不能单独证明泄漏。

## 文档入口

| 你要做什么 | 入口 |
| --- | --- |
| 配置连接、读取运行现场 | [诊断工作流](docs/DIAGNOSTICS.md) |
| 复现步骤、比较前后结果 | [Action/Journey](docs/ACTIONS.md) · [Evidence 工具](docs/EVIDENCE_TOOLS.md) |
| 运行或恢复游戏目标 | [Gameplay](docs/GAMEPLAY.md) |
| 关联源码、接入 Lab、接续研发 | [5.0 入口](docs/PAISLEY_PARK_5_0.md) · [development-flow Recipe](docs/DEVELOPMENT_FLOW.md) |
| 修改、构建、部署 | [Workshop](docs/WORKSHOP.md) |
| 调查框架、Mod 关系与相似历史问题 | [知识入口](docs/MOD_KNOWLEDGE.md) · [框架注册与缓存采用](docs/MAPLEBIRCH.md) · [依赖与补丁检查](docs/MODHUB.md) |
| 接入专属诊断或公共格式 | [Integration](docs/INTEGRATIONS.md) · [Schema 与格式](docs/FORMATS.md) |
| 查询验收、限制与历史 | [6.1 收口](docs/CLOSEOUT_6_1.md) · [6.1 Windows 验收](docs/WINDOWS_6_1.md) · [6.0 历史验收](docs/CLOSEOUT_6_0.md) · [历史索引](docs/HISTORY.md) |
| 贡献与打包 | [项目规则](AGENTS.md) · [架构](docs/ARCHITECTURE.md) · [包清单](docs/RELEASE_PACKAGE.md) |

## 贡献与开发

贡献时按改动风险选择最小充分检查。离线入口为 `npm test` 和 `python -m unittest discover -s tests -p "test_*.py"`；离线通过不能替代真机或业务证明。

源码使用 [MIT](LICENSE)，许可不涵盖游戏、加载器或其它 Mod。不要提交真实存档、日志、截图、凭据、第三方资源或 APK。
