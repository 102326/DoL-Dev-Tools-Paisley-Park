# DoL Dev Tools: Paisley Park

**3.0 — Gold Experience Requiem · 当前发行版 3.0.3**

面向 DoL Mod 生态的本地开发工具系统。连接真实 Android / WebView，帮助开发者和 Agent 查看运行现场、调查问题、复现操作，并在修改、构建和部署后验证结果。

除了诊断，3.0 还支持 Agent 根据游戏目标持续观察、决策和行动，在普通事件中调整路线，并在中断后接着完成原任务。Gameplay 可用于真实业务验收，也可用于有边界的游玩。

[下载 3.0.3](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v3.0.3) · [快速开始](#快速开始) · [文档导航](#文档导航)

## 能做什么

- **进入真实现场**：查看手机画面、原生布局与 WebView 内部的 DOM、CSS、Console、异常、网络摘要和页面状态。
- **调查界面与 Mod 问题**：检查控件命中、结构和样式差异，结合 Android 日志、内存与帧统计，按问题选择采集深度。
- **复现并比较结果**：用 Action / Journey 执行审阅过的步骤，保留检查点、失败记录和前后 Evidence，生成可分享的本地问题报告。
- **连接开发流程**：使用目标项目自己的源码、构建和部署方式，核对实际加载的制品，再回到同一场景复验。
- **持续执行游戏目标**：让宿主 Agent 读取当前场景、选择动作、处理普通偏航，并通过原游戏状态确认完成。

三个现场入口各有分工：

| 入口 | 作用 |
| --- | --- |
| Android CLI | 看见真机画面，取得标注截图与原生布局 |
| Chrome Inspect / CDP | Agent 直接进入真实 WebView，读取 DOM、Computed Style、Console、异常、Network、Storage 摘要与 Performance |
| ADB | 查看 Android / App 的日志、进程、内存、帧统计和生命周期 |

这些能力由同一套诊断、执行和证据流程连接起来：记录明确的设备与 App、每步结果和制品来源，支持前后比较、检查点和恢复。直接 CDP / ADB 查询仍可用于更灵活的调查；已有标准能力能覆盖问题时，优先复用它，减少临时脚本与重复采集。

## 3.0 — Gold Experience Requiem

3.0 在指定步骤的工具执行之上，加入了目标驱动的 Gameplay Runtime。宿主 Agent 负责理解场景与决策，Tools 负责可靠地执行、保存进度和核对结果：

> 目标 → 观察现场 → 理解与决策 → 行动 → 读取结果 → 调整计划

- **按目标推进**：目标可以跨越多段 Journey；普通对话、随机事件或路线变化出现后，重新理解现场再继续。
- **保留 Working Memory**：保存短计划、已走路线、事件与返回子目标，帮助后续决策；这些解释不会替代真实游戏状态。
- **中断后接管**：跨进程或换宿主 Agent 时，重新读取原目标、累计预算、Memory 和当前场景，沿同一个 Session 继续。
- **确认业务结果**：购买、资源变化、穿戴与返回条件由原状态和动作结果证明，完成判断围绕目标。
- **协调副作用**：消费和未决动作持续记录，避免恢复后重复购买或把结果未知的动作当作没发生。
- **复用开发验收底座**：Gameplay 与开发检查共享执行、证据和恢复核心；开发模式可加入更严格的检查点。

玩法目标与当前版本的执行细节分层：`Goal → Semantic → Capability Provider → Execution → Outcome`。原生 DoL 是主要对象；商店和衣柜是领域 Provider，Soft & Wet 等 Mod 提供可选映射。实现协议与支持范围见 [Gameplay 指南](docs/GAMEPLAY.md)。

## 已验证的例子

**Mod 更新与界面复验。** 在独立 Android 测试 App 中，将 DoLGameUI 2.0.3 更新为 2.1.0，核对持久加载来源与 JS/CSS 哈希，打开/关闭真实设置并比较限定范围 CSS；重启后再次确认加载与行为。这证明了真实发行包更新和设置复验，不代表工具能自动修复任意项目源码。见 [业务 Mod 更新记录](docs/BUSINESS_MOD_UPDATE.md) 和 [开发工作流](docs/WORKSHOP.md)。

**条件购衣、返回并穿戴。** Agent 在预算内购买黑色发卡，处理途中普通事件后返回卧室并穿戴。购买后独立进程恢复保留原目标、预算与购买证明，没有重复购买；最终核对资金、库存、完整颜色变体和穿戴状态。

**原生活动与新宿主接管。** Agent 从卧室前往花园劳动，达到体能目标后返回。没有旧聊天的新宿主从同一个 Session 读取进度继续，累计约 12 分 40 秒有效连续运行。与购衣场景一样，这条实机路径不依赖 Soft & Wet 私有 Runtime、衣柜 Adapter 或 UI Mod。两条 Gameplay 路径的结果和覆盖边界见 [代表性验收](docs/CLOSEOUT_3_0_1.md#validated)。

## 快速开始

从 [Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v3.0.3) 下载 `DoL-Dev-Tools-Paisley-Park-3.0.3.zip`，核对随附 SHA256，解压到稳定目录并进入工具根目录。包不包含游戏、APK 或设备工具。

需要 **Node.js 22.12+**。Android 现场需要已有 **ADB、USB 调试授权和明确的设备 serial / App package**；先手动打开目标 App。WebView 内部观察还需要 App 开启调试支持。ADB 不在 PATH 时，在当前进程设置 `DOL_ADB` 为已有 `adb.exe` 的绝对路径；详见 [环境与连接说明](docs/DIAGNOSTICS.md#快速入口)。

### 普通开发诊断

Generic Diagnostics 不需要安装 npm 依赖，也不要求任何特定 Mod。以下为 Windows PowerShell 示例，请替换设备和包名占位符：

```powershell
New-Item -ItemType Directory -Path artifacts -Force
.\Paisley-Park.cmd doctor --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/doctor.json
.\Paisley-Park.cmd capture --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/screen-001
# 需要 WebView 结构、Console、网络等证据时：
.\Paisley-Park.cmd evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-001 --scope '#passages'
```

检查 Doctor 的具体结果后再进入依赖步骤；它不会修复环境或启动游戏。输出目标必须尚不存在，父目录须先创建；重复采集使用新的文件名或目录。其他平台可将 launcher 替换为 `node scripts/dol-dev.cjs`。查看页面 target、深入检查或比较证据时，进入 [诊断工作流](docs/DIAGNOSTICS.md) 与 [Evidence 工具](docs/EVIDENCE_TOOLS.md)。

### Agent / Gameplay

先满足上面的设备与 WebView 条件，再在 Tools 根目录安装锁定的 Gameplay 依赖，并安装 Skill：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
.\Paisley-Park.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

Skill 目标目录必须尚不存在；已有安装先备份并移出该路径，安装器会拒绝覆盖。Tools 必须留在稳定位置，Skill 调用这一份 Tools。Node 22 直接运行 Gameplay CLI 时需加 `--experimental-sqlite`，Windows launcher 已包含；详细安装、更新和搬迁见 [Skill 安装](docs/SKILL_INSTALL.md)。

在下一回合显式使用 `$dol-dev-tools-paisley-park`，提供设备、App、目标与预算。例如对 Agent 说：

> 在指定的已授权测试 App 中，去花园劳动，达到约定体能目标后回卧室。先核对当前状态与支持能力，设置本次时间和动作预算；途中普通事件自行处理，中断后恢复原 Session。

这是给宿主 Agent 的任务示例，具体 Goal 条件需按当前原状态和受支持能力确定。Agent 将其落实为 Goal 与 Decision，Tools 不内置无人值守的模型服务。创建目标、执行和恢复的完整步骤见 [Gameplay 工作流](docs/GAMEPLAY.md)。

## 使用边界

- **通用诊断与可选 Integration 分离**：Generic 不依赖 Soft & Wet、MapleBirch、ModHub 或特定 UI Runtime；Integration 缺失、不支持或失败会独立记录，不使已成功的 Generic 采集失效。
- **Gameplay 覆盖有边界**：需要宿主 Agent 与已审阅的动作/结果合同，尚未支持全部 Passage、版本、Mod 和业务。正常事件可重新规划；缺少可靠执行或结果证明时拒绝派发。旧 Foundation journal 不自动迁移。
- **存档与未知结果受保护**：删除或覆盖已有存档默认禁止。恢复不会重置累计预算或盲目重放未决副作用；新合同不能无依据结清旧动作。
- **证据与结论分开**：Evidence 的 complete / partial / failed 描述本次采集。结构可能截断，像素差异不等于兼容失败，内存增长不等于泄漏，采集完整不等于业务通过。
- **本地资料与代码权限**：私有截图、日志、存档与游戏数据不自动上传，分享前须审查。Integration 是经审查的本地代码，Worker 用于故障隔离，不是权限沙箱；Evaluator 能执行传入的页面 JavaScript，“只读”是内置 Probe 的使用约束。

具体支持范围、旧未决 effect 和后续覆盖见 [当前验收与已知限制](docs/CLOSEOUT_3_0_3.md)。规划中的能力与已交付功能分开记录。

## 文档导航

| 要做什么 | 资料 |
| --- | --- |
| 配置环境、连接现场、查看命令 | [诊断工作流](docs/DIAGNOSTICS.md) · `Paisley-Park.cmd --help` |
| 复现操作与开发检查点 | [Action / Journey](docs/ACTIONS.md) |
| 比较证据、整理问题报告 | [Evidence 工具](docs/EVIDENCE_TOOLS.md) · [格式与 Schema](docs/FORMATS.md) |
| 运行和恢复 Gameplay 目标 | [Gameplay](docs/GAMEPLAY.md) |
| 安装与使用 Agent Skill | [安装指南](docs/SKILL_INSTALL.md) · [Skill 源码](.agents/skills/dol-dev-tools-paisley-park/SKILL.md) |
| 接入项目专属诊断 | [Integration Contract](docs/INTEGRATIONS.md) |
| 修改、构建、部署与贡献 | [Workshop](docs/WORKSHOP.md) · [项目规则](AGENTS.md) · [架构边界](docs/ARCHITECTURE.md) |
| 查询真实验收和安全限制 | [当前收口](docs/CLOSEOUT_3_0_3.md) · [验证记录](docs/VALIDATION.md) |
| 了解版本演进与未来方向 | [历史索引](docs/HISTORY.md) · [能力蓝图](docs/BLUEPRINT.md) |

贡献时使用目标模块的最小充分检查；Tools 的离线检查入口为 `npm test` 和 `python -m unittest discover -s tests -p "test_*.py"`。离线通过不能代替真机或游戏业务证明。

工具源码使用 [MIT](LICENSE)；许可不涵盖游戏、加载器或其他 Mod。不要提交真实存档、日志、截图、凭据、第三方资源或 APK。
