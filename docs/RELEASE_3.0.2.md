# DoL Dev Tools: Paisley Park 3.0.2 — Gold Experience Requiem

**Gold Experience Requiem** 是 Paisley Park 3.0 的目标驱动 Gameplay 阶段。Paisley Park 仍是一套面向 DoL Mod 生态的本地开发工具：进入真实 Android / WebView，调查问题、复现操作、保存证据，并连接目标项目的修改、构建、部署与复验流程。

## 3.0 系列带来的能力

在 Android CLI、Chrome Inspect / CDP、ADB、Action / Journey 与 Evidence 基础上，3.0 支持宿主 Agent 围绕目标持续执行：

- 根据真实场景选择动作，处理普通对话和事件，路线变化后动态重规划。
- 保存原目标、Working Memory、短计划、事件与返回子目标，以及累计时间、动作和消费预算。
- 跨进程或换宿主恢复同一个 Session，重新读取现场，再决定下一步。
- 从原游戏状态与动作 Outcome 验证资源、购买、穿戴和返回条件；持续记录未决副作用，避免恢复后重复操作。
- Gameplay 与开发验收共用执行和恢复核心，开发模式保留更严格的检查点与失败记录。

原生 DoL 是 Runtime 的主要对象，衣柜与商店是领域 Provider，Soft & Wet 等 Integration 为可选增强。代表性 Android / Lyra 0.5.12.13 验收已证明条件购衣/返回/穿戴，以及花园劳动达到体能目标后返回；后者包含没有旧聊天的新宿主接管。两条路径均不依赖 Soft & Wet 私有 Runtime、衣柜 Adapter 或 UI Mod。详细范围见 [代表性验收](CLOSEOUT_3_0_1.md#validated)。

## 3.0.2 的实际更新

本补丁保留上述 Runtime 和验收成果，重点改善安装体验与维护边界：

- **Gameplay 依赖提前检查**：缺少 XState 或 SQLite 时，在 Android I/O、输出目录、Store 和 Session 创建前明确失败，CLI 提供安装/运行指引；Generic Diagnostics 仍能独立使用。
- **Provider 与兼容 API 说明**：明确新增 profile 可复用的发现、绑定、执行和 Outcome 路径；`reach-passage`、`native-state`、`native-knowledge` 作为低层 compatibility API 保留，不强行改名或迁移 Session。
- **名称与入门文档统一**：正式阶段名为 **3.0 — Gold Experience Requiem**，补充首次使用入口，统一当前 package、CLI、Skill 和文档的表述。

本轮公开 README 与 Release 说明另作阅读体验整理，未修改运行时代码、Schema、动作行为或本页发布资产。

## 安装或更新

下载本页的 `DoL-Dev-Tools-Paisley-Park-3.0.2.zip`，核对随附 SHA256，解压到稳定目录。需要 **Node.js 22.12+**；Android 需要已有 ADB、USB 调试授权、明确的 serial / package，先手动打开目标 App。WebView 采集需要 App 开启调试支持。

普通诊断不需要 npm 依赖。在工具根目录运行：

```powershell
New-Item -ItemType Directory -Path artifacts -Force
.\Paisley-Park.cmd doctor --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/doctor.json
.\Paisley-Park.cmd capture --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/screen-001
```

请替换设备和包名；输出目标必须尚不存在。需要 Gameplay 时，在同一根目录先执行 `npm ci --ignore-scripts --no-audit --no-fund`，再按 [Skill 安装](SKILL_INSTALL.md) 配置宿主 Agent。Node 22 直接运行 Gameplay CLI 需加 `--experimental-sqlite`，Windows launcher 已包含。

更新时保留旧 Tools、Skill 和私有资料，向新的稳定目录解压，备份并移出旧 Skill 后安装到空目标。安装不会迁移旧 journal 或清除共享 Store / 未决 effect。两条上手路径见 [README](../README.md#快速开始)，完整协议见 [Gameplay](GAMEPLAY.md)。

## 重要限制

- Gameplay 需要宿主 Agent 与受支持、已审阅的动作合同；并非全部 Passage、DoL 版本、Mod 或业务都已覆盖。当前具体范围和真实旧未决 effect 见 [验收与已知限制](CLOSEOUT_3_0_2.md)。
- 删除或覆盖已有存档默认禁止；未知结果保留原合同与证据，不因恢复或换 Provider 盲目重放。
- Generic 不依赖特定 Mod，Optional Integration 缺失或失败独立记录。Integration 为经审查的本地代码，Worker 不是权限沙箱；Evaluator 可执行传入的页面 JavaScript。
- Evidence 完整只表示采集状态，不能替代业务结论。私有截图、日志、存档和游戏数据不自动上传，分享前须审查。

旧 v3.0.0 / v3.0.1 公开 Release 和 tag 已移除，当前下载以本页资产及 SHA256 为准；历史验证仍可在 [历史索引](HISTORY.md) 查阅。本次页面重写未再次替换资产或改动 tag。
