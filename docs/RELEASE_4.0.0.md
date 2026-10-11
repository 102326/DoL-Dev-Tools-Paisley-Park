# DoL Dev Tools 4.0.0 — Bites the Dust

DoL Dev Tools 是面向 DoL Mod 作者和开发者的本地工具包。它连接 Android、WebView 和项目源码，帮助你查看现场、复现问题、保留证据，并在修改后验证结果。通用诊断不要求安装 Soft & Wet 或其它特定 Mod。

4.0 让 Agent 在你明确允许的测试范围内，更连贯地完成调试与游戏实验。它仍需要宿主 Agent 理解目标和现场，不是一个独立运行的 AI 服务。

## 2026-10-12 验货修订候选

本次保持 4.0.0，修复仅授权保存却无法使用原 Recipe、并发打开可能回退执行记录版本、保存读回挂起遗留观察器，以及新 App 数据被误判为旧目标成果的问题。导航清理冲突也会如实报告。

数量调整与衣柜选槽目前缺少可靠的结果合同，本候选移出自动 GER 派发：购买要求数量已为 1，穿脱要求槽位已选好；不宣称“2 → 1 → 购买”或选槽连续链已经支持。历史未知结果不变。Debug 与受支持 GER 操作仍在既有授权内自主执行。

这是本地验货候选，未替换 GitHub 下载；没有本轮远程 Push、合并、Tag 或 Release 授权。修复与实际回归见 [定向收口记录](F1_F5_CLOSEOUT_4_0.md)。

## 原 4.0 主要变化

- **调试更自主**：一次说明工作区、测试 App 和数据范围后，Agent 可以连续调查、修改状态、操作游戏、构建部署和复验，不必每到一个内部阶段就重新询问。
- **持续游戏目标更灵活**：消费额度可以不设，也可以明确设为零或有限金额。经过审核的实验脚本、状态准备和受支持的存档操作可纳入同一任务；结果明确的路线可以重复探索。
- **Android 工具协作**：结合 Android CLI 的画面和布局、ADB/CDP 的系统与 WebView 现场，以及适用的官方 Skills 和 Knowledge Base。各项结果分别记录，不把一个工具可用当成全部能力通过。
- **执行更可靠**：页面重载后拒绝旧文档绑定；恢复时核对实际动作和结果，避免重复副作用。历史结果未知的动作会保留，不因升级或后续成功而被改写。

## 安装与升级

取得 `DoL-Dev-Tools-4.0.0.zip` 后，核对随附 SHA-256，解压到新的长期保留目录。需要 **Node.js 22.12+**；包不包含游戏、APK、ADB、node_modules 或私人证据。

在解压后的 Tools 根目录使用 PowerShell：

```powershell
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
```

`--version` 应返回 `4.0.0`，`--help` 首行应显示 `DoL Dev Tools 4.0.0 — Bites the Dust` 及用途说明。原来的 `Paisley-Park.cmd` 仍可使用。

普通诊断不需要 npm 依赖。使用 Gameplay 与 Agent Skill 时，在同一目录执行：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
.\DoL-Dev.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

已有 Skill 请先完整备份并移出原路径，保留旧 Tools；安装器会拒绝覆盖。确认 resolver 指向新的 Tools 和 `4.0.0`，下一回合可显式使用 `$dol-dev-tools-paisley-park`。Android 现场另需已有 ADB、USB 调试授权和可调试的目标 WebView。详细步骤见 [安装指南](SKILL_INSTALL.md) 和 [快速开始](../README.md#快速开始)。

## 重要注意事项

- **先明确授权范围**：包括设备、App、项目和测试数据。存档覆盖、删除或数据重建只有在对应授权内才能执行；范围外资源和公开发布仍需单独授权。
- **备份执行记录后再使用数据重建**：4.0 的原生数据重建功能可能升级同一 SQLite 执行记录。升级后 3.0.3 不能继续写入它，也不能恢复 4.0 的新任务。没有经过验证的自动降级或历史合并流程；备份方法见安装指南。
- **结果未知仍然是未知**：旧动作不会因改名、升级或重建数据自动变成成功或未发生。执行超时也不代表设备动作已取消，恢复时不要直接重复执行。
- **只运行审核过的本地脚本**：实验 Recipe 拥有实际 Node 文件和网络权限，不是隔离沙箱。不要执行来历不明的脚本。

## 已知限制与问题反馈

当前验证集中于代表性 Android 17 / WebView、DoL 0.5.12.13 原生 IndexedDB 存档和部分 Gameplay 操作。一次自动保存验证不代表所有存档后端都兼容；完整 Android Mod 自动修复、构建、部署、加载与复验闭环仍未验证，也不承诺自动修好任何 Mod。

报告问题时，请说明工具、游戏与 Mod 版本，设备/WebView 环境、最短复现步骤、预期与实际结果，并附脱敏后的错误和证据摘要。可先用 `evidence` 采集，再通过 `support` 整理分享内容；截图、路径和日志仍须人工检查，不上传存档、SQLite、凭据或私人执行记录。技术验证、升级细节与覆盖边界见 [4.0 技术说明](CLOSEOUT_4_0.md)。
