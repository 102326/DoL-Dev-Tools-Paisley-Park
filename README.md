# DoL Dev Tools — Gold Experience

创造能力，赋予行动。

Gold Experience 是面向 DoL Mod 作者和 Agent 的本地开发工具。你可以查看真实 Android / WebView 现场，也可以在独立 Chrome 中调查获准的本地页面，再接到源码、构建和复验。它可以独立使用，也可以由宿主 Agent 调用。

**7.0.0** · [下载工具包](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/download/v7.0.0/DoL-Dev-Tools-7.0.0.zip) · [安装与升级](docs/SKILL_INSTALL.md) · [本版更新](docs/RELEASE_7.0.0.md) · [支持范围](docs/CLOSEOUT_7_0.md)

这是此前的 Paisley Park。旧 Skill 标识、启动命令和数据路径继续兼容，不需要改名或迁移已有账本。它不承诺自动修复所有 Mod、全平台兼容或完整自主游戏 Agent。

当前源码分支正在开发 **7.1.0-rc.1**，已发布版本仍为上方的 7.0.0。7.1 同步官方 Android 工具与 Skill，保留现有 ADB/CDP 和 GER 合同；工具选择见[工具链指南](docs/TOOLCHAIN.md)。本地候选尚未发布，以下下载步骤仍对应正式 7.0.0。

## 它能帮你做什么

问题出在设备上时，源码和构建日志往往只说明了一部分。你还需要知道当前加载了哪个包、控件为什么这样显示，以及修改后是否真的生效。

- 查看画面、DOM、样式、Console 和系统日志，调查界面与运行问题。
- 在自有 Chrome 测试 Profile 中复现获准页面，准确选择目标与文档，保留操作前后证据。
- 按版本查找游戏源码中的 Passage、宏、符号和调用线索，再核对现场实际采用的实现。
- 调用目标项目自己的构建与部署流程，比较修改前后，区分“构建成功”“包已加载”和“业务结果正确”。
- 接续有版本条件的 Mod 研究经验；在已授权范围内完成受支持的游戏目标，并保留未知结果和原回执。

已有标准能力足够时优先使用；需要更灵活的调查时，可以直接使用 CDP、ADB 或项目测试。不要求每个问题都走完整管线。

## 快速开始

初次使用建议从诊断、现场采集和 Evidence 开始，需要时再接入 Skill 与 Agent 工作流。无需先理解全部内部机制。

### 1. 解压并确认版本

从 [7.0.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v7.0.0) 下载 `DoL-Dev-Tools-7.0.0.zip`，核对随附的 SHA-256 和来源清单，再解压到长期保留的新目录。保留旧 Tools、Skill 和执行记录，确认新版本可用后再切换。[6.1.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.1.0) 等历史版本继续保留。

7.0 要求 **Node.js 26.0.0+**。本轮 Windows 使用26.13.0；旧6.1.0包仍按其原要求使用。在 Tools 根目录运行：

```powershell
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
```

版本输出应为 `7.0.0`，help 首行以 `DoL Dev Tools — Gold Experience（黄金体验） 7.0.0` 开头。`Paisley-Park.cmd` 仍可使用；其它平台使用 `node scripts/dol-dev.cjs`。

### 2. 连接已授权的 Android App

需要已有 ADB、USB 调试授权、明确的设备 serial 和 App package。先打开目标 App；读取 WebView 内部还需要 App 开启调试支持。ADB 不在 PATH 时，在当前进程将 `DOL_ADB` 设为已有 `adb.exe` 的绝对路径，见 [连接说明](docs/DIAGNOSTICS.md#快速入口)。

替换下面的设备与包名占位符，然后运行：

```powershell
New-Item -ItemType Directory -Path artifacts -Force
.\DoL-Dev.cmd doctor --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/doctor.json
.\DoL-Dev.cmd capture --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/screen-001
# 需要 WebView 结构、Console、网络等证据时：
.\DoL-Dev.cmd evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-001 --scope '#passages'
```

先读 Doctor 的具体结果。它不会修复环境或启动游戏，`complete` 也不单独证明目标 WebView 可用。输出文件或目录必须尚不存在，重复采集换新名称。通用诊断无需 npm 依赖；工具包不捆绑游戏、APK、ADB 或 Android CLI。

### 3. 让 Agent 使用 Skill

需要Agent工作流时，在Tools根目录安装Skill；普通诊断、源码调查、Skill安装和resolver无需先装npm依赖：

```powershell
.\DoL-Dev.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

仅当任务使用Gameplay时，再在实际Tools根目录安装锁定依赖：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
```

安装器拒绝覆盖已有 Skill。更新时先备份并移出旧安装，保留原 Tools，再向空目录安装；Tools 必须留在稳定位置。7.0使用Node26内置SQLite，Gameplay示例及Windows launcher保留显式`--experimental-sqlite`参数。详细步骤见 [安装指南](docs/SKILL_INSTALL.md)。

安装后按宿主支持的方法刷新或开启新会话，确认 Skill 确实被发现；文件安装和 resolver 成功不保证下一回合自动可用。发现后显式使用 `$dol-dev-tools-paisley-park`，告诉 Agent 工作区、设备、App、问题或目标，以及获准操作的数据范围。例如：

> 检查已授权测试 App 中这个界面的布局问题，先确认实际加载的 Mod，再找到相关源码。只修改有证据指向的部分，使用项目已有方式构建和复验。

宿主 Agent 负责理解现场与决策，Tools 负责执行、记录与结果核验。持续游戏目标使用共享 Gameplay Runtime（GER）；普通只读调查或点击无需新建 Goal。支持的目标、预算和恢复步骤见 [Gameplay 指南](docs/GAMEPLAY.md)。

## 核心能力

| 入口 | 用途与边界 |
| --- | --- |
| Android CLI | 真机画面、标注截图与原生布局；按需使用已安装的官方工具 |
| Chrome Inspect / CDP | 进入 WebView 内部读取 DOM、Computed Style、Console、异常、Network、Storage 摘要和 Performance |
| ADB | Android / App 的日志、进程、内存、帧统计和生命周期 |
| PC Chrome | 显式选择已安装 Chrome，以独立 Profile 和资源白名单运行获准 HTML，复用 Action/Journey、GER 与 Evidence |
| 源码查询 | 在指定工作树或固定 Git revision 中组合线索，输出有界候选、摘要与未覆盖原因；不自动下载缺失源码 |
| Source Link / Component Lab | 为已接入 UI 工程关联组件源码和本地预览；首轮 Source Link 只覆盖选定商店 Toolbar |
| Skill / Recipe | 按问题选择工具、研究 Mod 机制，并接续现场、源码与制品的调查依据 |

Chrome Inspect/CDP 是 Agent 进入真实 WebView 的桥梁。通用诊断不要求 Soft & Wet 或其它特定 Mod；项目 Integration 只是可选增强，失败时单独记录，保留已成功的通用采集。

Component Lab 由目标 UI 工程维护，不在 Tools ZIP 中。它用于组件开发与预览，不代表游戏内热替换、自动部署或业务验证。

## 7.0 有哪些变化

7.0 将独立 PC Chrome 接入已有开发流程：准确选择页面，拒绝重载后的旧文档绑定，用同一套工具做诊断、复现、受支持业务操作和证据保存。持久业务仍使用 GER，不把普通点击补记成已结算动作。参见 [PC 使用说明](docs/PC_RUNTIME.md)。

需要调查原游戏实现时，可以用 `source-find` 查指定版本，组合 Passage、文字、路径或符号线索。达到预算或缺少 Git 对象会如实返回部分结果，不隐式联网补全。候选源码与设备实际采用的代码仍要分别核对。参见 [源码查询](docs/GAME_SOURCE.md)。

内部代码改为 TypeScript 维护，运行包继续提供预生成 CommonJS。使用者不需要安装 TypeScript 或额外 loader。部分页面函数保持原文，以兼容已有执行摘要；这不代表所有页面代码都有静态类型保证。

Android 继续使用 Android CLI、ADB 和 CDP。Kotlin 设备探针只保留为实验，没有接入生产，也不要求安装 helper。此前 White Snake 的 Mod 知识、按需 Patch 观测、行为保持配方，以及 Debug、Gameplay 和恢复能力继续保留，见[历史说明](docs/HISTORY.md)。

## 当前验证范围

本版已有 Windows Chrome 代表性宿主验证、真实 DoL 保存与导航、独立 Android 测试副本的原生保存及原回执恢复，以及源码查询、Windows 文件占用和独立包安装检查。原始输入、固定提交、各轮实际结果和复用边界保留在 [7.0 收口](docs/CLOSEOUT_7_0.md)，正式包来源见随附 `artifact-manifest.json`，本轮验货结果在收口记录中保留。

Windows 使用 Node26.13.0，未在Windows重跑最低26.0.0；其它系统的既有记录不能代替本机结果。没有穷举全部游戏、存档、Mod、WebView 或设备，也未完成无人接管的完整 Android Mod 修复闭环。

## 已知限制

Integration 是经审查的本地代码，Worker 用于故障隔离，不是权限沙箱。Evaluator 可以执行传入的 JavaScript，“只读”是 Probe 和工作流约束。

存档、覆盖、删除和数据重建必须属于用户实际授权。结果未知的动作保留原记录，不盲重放，不通过换 Store、Profile 或游戏实例隐藏。旧 Session 的 Store 缺失时停止，避免创建空库冒充恢复；新库不能还原遗失历史。升级后的 Store 不允许3.0.3继续写入，见[数据兼容提醒](docs/CLOSEOUT_4_0.md#数据重建与旧记录)。

部分历史原目标的账本恢复仍受缺失数据与身份差异阻挡。这是该目标的恢复限制，不表示独立测试副本已经替它结清未决。详细边界见[覆盖账本](docs/CLOSEOUT_7_0.md#coverage-ledger)。

后台页面截图可能超时。不要把采集失败当成操作未发生而重复点击。Evidence 的 complete / partial / failed 描述一次采集；截图差异不能单独证明兼容失败，内存增长不能单独证明泄漏。Lab 回调、构建成功、包已加载与游戏业务通过是不同证据。

截图、日志、存档和私人原始证据不自动上传；工具包不分发游戏、APK、第三方 Mod 或私人数据。

## 文档入口

| 你要做什么 | 入口 |
| --- | --- |
| 配置连接、读取运行现场 | [诊断工作流](docs/DIAGNOSTICS.md) · [Inspector](docs/INSPECTORS.md) |
| 在独立 Chrome 测试获准页面 | [PC Runtime](docs/PC_RUNTIME.md) |
| 复现步骤、比较前后结果 | [Action/Journey](docs/ACTIONS.md) · [Evidence](docs/EVIDENCE_TOOLS.md) |
| 运行或恢复游戏目标 | [Gameplay](docs/GAMEPLAY.md) |
| 修改、构建、部署 | [Workshop](docs/WORKSHOP.md) · [开发流程](docs/DEVELOPMENT_FLOW.md) |
| 按版本查原游戏源码 | [游戏源码与source-find](docs/GAME_SOURCE.md) |
| 关联组件源码与预览 | [Source Link / Lab](docs/PAISLEY_PARK_5_0.md) |
| 调查框架与相似历史问题 | [Mod知识](docs/MOD_KNOWLEDGE.md) · [框架注册与缓存](docs/MAPLEBIRCH.md) · [依赖与补丁](docs/MODHUB.md) |
| 接入项目诊断或公共格式 | [Integration](docs/INTEGRATIONS.md) · [格式](docs/FORMATS.md) |
| 查询验证与限制 | [7.0收口](docs/CLOSEOUT_7_0.md) · [历史索引](docs/HISTORY.md) |
| 贡献与打包 | [项目规则](AGENTS.md) · [架构](docs/ARCHITECTURE.md) · [包清单](docs/RELEASE_PACKAGE.md) |

## 贡献与开发

按改动风险选择最小充分检查。离线入口是 `npm test` 和 `python -m unittest discover -s tests -p "test_*.py"`；修改权威 TypeScript 后按[维护说明](docs/SKILL_INSTALL.md#resolver-maintenance)生成并核对 CommonJS。离线通过不能代替真机或业务证明。

源码使用 [MIT](LICENSE)，许可不涵盖游戏、加载器和其它 Mod。不要提交真实存档、日志、截图、凭据、第三方资源或 APK。
