# DoL Dev Tools: Paisley Park

面向 DoL Mod 作者和 Agent 的本地开发工具。查看真实 Android / WebView，调查界面与运行问题，找到相关源码，再核对构建包和实际加载结果。

**5.0.0 — Paisley Park** · [下载与版本](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases) · [安装与升级](docs/SKILL_INSTALL.md) · [更新说明](docs/RELEASE_5.0.0.md)

## 从真实运行现场开始

Android CLI、Chrome Inspect/CDP 和 ADB 是三个主要入口：

| 入口 | 你能看到什么 |
| --- | --- |
| Android CLI | 真机画面、标注截图与原生布局 |
| Chrome Inspect / CDP | WebView 内部的 DOM、Computed Style、Console、异常、Network、Storage 摘要与 Performance |
| ADB | Android / App 的日志、进程、内存、帧统计和生命周期 |

Chrome Inspect/CDP 也是 Agent 进入真实 WebView 的桥梁。它可以读取当前控件、样式和页面状态，结合截图与系统日志判断问题。通用诊断可用于原版、内容、框架、UI 和管理器 Mod，不要求安装 Soft & Wet 或任何特定 UI Runtime。

日常开发可以用它：

- 检查界面错位、控件命中、Console 异常和 Mod 加载状态。
- 用 Action/Journey 复现已审阅的步骤，保留失败和前后证据，比较修改结果。
- 连接目标项目自己的源码、构建和部署流程，确认设备实际加载的包。
- 在授权范围内推进受支持的游戏目标，中断后继续，并读取原游戏状态确认结果。

已有标准能力足够时优先使用；需要更灵活的调查时，可以直接使用 CDP、ADB 或项目测试。按当前问题选择工具，不要求每次走完整管线。

## 快速开始

### 1. 解压并确认版本

从 [Releases](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases) 选择对应版本的 ZIP，核对随附 SHA-256，解压到长期保留的新目录。本文对应 `DoL-Dev-Tools-5.0.0.zip`；若该版本尚未出现在下载页，使用已发布版本，并按对应版本的说明安装。保留旧 Tools 和 Skill。

需要 **Node.js 22.12+**。在 Tools 根目录运行：

```powershell
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
```

5.0.0 包的版本输出应为 `5.0.0`，help 首行为 `DoL Dev Tools 5.0.0 — Paisley Park`。`Paisley-Park.cmd` 仍可使用；其它平台使用 `node scripts/dol-dev.cjs`。

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

需要 Agent 开发工作流或 Gameplay 时，在同一 Tools 根目录安装锁定依赖与 Skill：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
.\Paisley-Park.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

安装器拒绝覆盖已有 Skill。更新时先备份并移出旧安装，保留原 Tools，再向空目录安装；Tools 必须留在稳定位置。Node 22 直接运行 Gameplay CLI 需要 `--experimental-sqlite`，Windows launcher 已包含。详细步骤见 [安装指南](docs/SKILL_INSTALL.md)。

下一回合显式使用 `$dol-dev-tools-paisley-park`，告诉 Agent 工作区、设备、App、问题或目标，以及获准操作的数据范围。例如：

> 检查已授权测试 App 中这个界面的布局问题，先确认实际加载的 Mod，再找到相关源码。只修改有证据指向的部分，使用项目已有方式构建和复验。

宿主 Agent 负责理解现场与决策，Tools 负责执行、记录与结果核验。持续游戏目标使用共享 Gameplay Runtime（GER）；普通只读调查或点击无需新建 Goal。支持的目标、预算和恢复步骤见 [Gameplay 指南](docs/GAMEPLAY.md)。

## 5.0 增加了什么

| 能力 | 当前用途与范围 |
| --- | --- |
| UI Source Link | 将选定组件关联当前源码，首轮支持商店 Toolbar；源码变动、缺输入或未知组件保留对应状态 |
| Vite Component Lab | 已接入的 UI 项目可编辑真实 Vue 组件并热更新；由 UI 工程维护，不包含在 Tools ZIP，也不证明游戏业务 |
| Skill / Recipe 接续 | 按问题关联现场、源码、构建与实际加载的包，同版本号仍核对字节；诊断可以独立交付，无需制造补丁 |

4.0.1 的自主 Debug、受支持 Gameplay、可选消费额度、执行回执和恢复能力继续保留。5.0 未改写 GER、SQLite 或历史 Unknown 的合同。更多入口见 [5.0 使用说明](docs/PAISLEY_PARK_5_0.md)。

## 能力与验证边界

A/B 已有有限原型验收，C 已完成代表性只读研发接续。发布前 Windows 独立包的 Node 全套 412 项通过；Python 3 项通过，1 项因缺可选 Pillow 跳过。既有 Android 证据包括页面身份、受支持的存档操作、自动保存和受控购买。详细时段与复用范围见 [5.0 收口](docs/CLOSEOUT_5_0.md) 和 [4.0 技术记录](docs/CLOSEOUT_4_0.md)。

完整 Android Mod 自主修复、构建、部署与业务复验闭环仍未验证；更多组件、设备、Provider 和 Mod 组合也不属于全覆盖承诺。Lab 回调、构建成功、包已加载与游戏业务通过是不同证据。

Integration 缺失、不支持或失败会单独记录，已成功的通用采集仍可保留。Integration 是经审查的本地代码，Worker 用于故障隔离，不是权限沙箱；Evaluator 可以执行传入的页面 JavaScript，“只读”是 Probe 和工作流约束。

操作存档、覆盖、删除或数据重建必须属于用户实际授权。已授权范围内自主推进，结果未知的动作保留原记录，不盲重放，也不通过换 Store 隐藏。使用数据重建前一致备份执行记录；升级后的 Store 不允许 3.0.3 继续写入，见 [升级提醒](docs/RELEASE_4.0.1.md#重要注意事项)。

截图、日志、存档和私人原始证据不自动上传。Evidence 的 complete / partial / failed 描述一次采集；像素差异不能单独证明兼容失败，内存增长不能单独证明泄漏。

## 按任务找文档

| 你要做什么 | 入口 |
| --- | --- |
| 配置连接、读取运行现场 | [诊断工作流](docs/DIAGNOSTICS.md) |
| 复现步骤、比较前后结果 | [Action/Journey](docs/ACTIONS.md) · [Evidence 工具](docs/EVIDENCE_TOOLS.md) |
| 运行或恢复游戏目标 | [Gameplay](docs/GAMEPLAY.md) |
| 关联源码、接入 Lab、接续研发 | [5.0 入口](docs/PAISLEY_PARK_5_0.md) · [development-flow Recipe](docs/DEVELOPMENT_FLOW.md) |
| 修改、构建、部署 | [Workshop](docs/WORKSHOP.md) |
| 接入专属诊断或公共格式 | [Integration](docs/INTEGRATIONS.md) · [Schema 与格式](docs/FORMATS.md) |
| 查询验收、限制与历史 | [5.0 收口](docs/CLOSEOUT_5_0.md) · [历史索引](docs/HISTORY.md) |
| 贡献与打包 | [项目规则](AGENTS.md) · [架构](docs/ARCHITECTURE.md) · [包清单](docs/RELEASE_PACKAGE.md) |

贡献时按改动风险选择最小充分检查。离线入口为 `npm test` 和 `python -m unittest discover -s tests -p "test_*.py"`；离线通过不能替代真机或业务证明。

源码使用 [MIT](LICENSE)，许可不涵盖游戏、加载器或其它 Mod。不要提交真实存档、日志、截图、凭据、第三方资源或 APK。
