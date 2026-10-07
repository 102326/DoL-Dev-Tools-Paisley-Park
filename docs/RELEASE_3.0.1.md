# DoL Dev Tools: Paisley Park 3.0.1 — Gold Experience

> 历史说明：此处记录当时的版本与验证。3.0.0/3.0.1 Release、tag 和原公开提交链已在 2026-10-08 按用户要求移除；当前入口是 README 与 3.0.2。

3.0.1 将撤回后的 Foundation 改为持久 Gameplay Runtime：Agent 根据当前 Scene 决策和重规划，同一 Session 协调执行、累计预算、Memory、事件返回与 Outcome。原生 DoL 是核心研发对象，衣物是领域 Provider；Generic Android/CDP/ADB/Evidence 与可选 Integration 保持独立。

条件购衣/穿戴 S1 和原生劳动/返回 S2 已通过代表性实机验收。S2 包含连续运行、中断恢复和无旧聊天新宿主接管；S1 保留真实金钱/库存/穿戴副作用及随机偏航。见 [收口及真实限制](CLOSEOUT_3_0_1.md) 和 [验证记录](VALIDATION.md)。这不是全设备、全版本、全业务支持声明。

## 安装与使用

使用 Node.js 22.12+。解压源码包到稳定目录；Gameplay 先运行 `npm ci --ignore-scripts --no-audit --no-fund` 安装锁定的 XState。Node 22 使用 `node --experimental-sqlite scripts/dol-dev.cjs ...`；Windows `Paisley-Park.cmd` 同样启用该参数。Generic Diagnostics 可不安装 Gameplay 依赖。

先 `--version` / `--help` / `doctor` 核对环境。Android 需已有 ADB、调试授权和明确设备/App；ADB 不在 PATH 时，每次新命令进程内设置 `DOL_ADB`。工具不自动下载 SDK 或选择游戏。见 [GAMEPLAY](GAMEPLAY.md) 的 Goal/Request/Proposal/dispatch/resume 示例和 [SKILL_INSTALL](SKILL_INSTALL.md)。

## 迁移与恢复

- 保留旧 Tools/Skill 安装作为回滚。向新的稳定目录安装本版本，备份旧 Skill 后由 `install-skill` 生成指向新包的空目标安装；不要仅修改旧安装文字。
- v3.0.0 Foundation tag、草稿、资产不修改。旧私有 Foundation journal 只读，不自动恢复为 v2 Session。新 Runtime 默认共享本机 `PaisleyPark/sessions-v2.sqlite`，不随源码包分发。
- 恢复同 Session 保留原 Goal、deadline、累计预算、checkpoint 失败及未决 effect。模型说明不能结清副作用；旧 attempt 只可按发生时的 binding/证据审查，禁止新合同追认或盲目再买。
- 正常游戏行为在授权测试环境默认自治；删除/覆盖已有存档默认禁止。未知普通场景先观察理解；丢失可靠现场、不可解释结果或明确高风险边界时暂停。

Schema 1 Generic Evidence/Support 和 Integration Contract 1 保持兼容。Integration 是受审本地代码，Worker 隔离故障而非权限安全沙箱；Evaluator 能执行页面 JavaScript，“只读”是 Probe/工作流约束。
