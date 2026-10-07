# DoL Dev Tools: Paisley Park 3.0.1 — Gold Experience 收口

本轮 Done 是共享 Gameplay Runtime、宿主 Decision 协议、持久 Memory/预算/Effect Ledger、原状态 Outcome、恢复与两条代表性路径成立，再完成文档、Skill、安装和发布一致性。不是穷举所有 DoL 场景。原 v3.0.0 Foundation tag、草稿和资产冻结；3.0.1 是重新验收后的版本。

## Delivered

- 同一 XState/SQLite Session 核心承载 Gameplay 与开发验收；Goal → Semantic → Capability Provider → Execution → Outcome。宿主 Agent 理解现场、提交 Decision，Runtime 协调生命周期、租约、累计预算、事件/返回子目标、进展和未知副作用；不是无人值守模型服务。
- 原生 DoL 是主对象。普通导航、事件、受限原生活动及 combat radio 选择使用共享 Action/CDP 和受审终止合同；衣物是独立领域 Provider，Soft & Wet 仅为可选增强。Generic Diagnostics 不依赖 Gameplay、XState 或特定 Mod。
- 版本/DOM/SugarCube 读取和执行下沉到现场及领域 Provider。旧未决动作保留原合同；新合同、当前 Goal 真或重启都不能追认旧结果。存档删除/覆盖默认禁止，无盲目重放。
- S1 与 S2 满足本轮代表性验收；文档、Skill 和发行安装路径以本版本为准，Foundation 文档保留为历史。

## Validated

Android 17 / 真实 Lyra 0.5.12.13 WebView / 独立离线原生测试 App，无 Soft & Wet 私有 Runtime、衣柜 Adapter 或 UI Mod 能力依赖：

| 场景 | 原状态与终止证明 | 同 Session 运行 |
| --- | --- | --- |
| S1：条件购衣 → 返回 → 穿戴 | 原黑色发卡购买一次，money 500→0，完整 variant 库存 0→1，再穿戴 black/black，白色发卡回库存，最终 Bedroom；spent 500 / reserved 0 / pending false | `e636bcc2-b809-4eb5-8747-027fa6b86ff2`，38 动作 / 73 观察；普通关门、教学战斗/对话、狗与欺凌事件自主处理；购买后独立进程恢复保留原 Goal/预算/witness，无重复购买 |
| S2：原生劳动资源目标 → 返回 | physique 5142.857→5322.857，目标 ≥5310；money 500 不变，timeStamp 2700→10140，最终 Bedroom；spent/reserved 0 / pending false | `2e546fad-421c-4306-a9f5-770dacc2c2c5`，9 动作 / 23 观察 / 9 重规划；约 12分40秒有效连续运行，无旧聊天新宿主读取同 Session 并接管 |

S1 墙钟约 42分57秒含研发/调查间隔，不能当作连续游戏时长；10—20 分钟连续验收由 S2 证明。两条路径未写存档或准备性修改原游戏变量。S2、M4 普通事件/同页继续、共享开发 checkpoint/失败保留和两模式核心证据复用，不为发布重复游戏业务回归。私有 JSON、截图、游戏资源、APK、Store 和详细状态不进入发布包。

发行检查与安装结果追加在 [VALIDATION](VALIDATION.md)。早期失败及修正保留在 [研发审计](GOLD_EXPERIENCE_REAUDIT.md)，不改写为从未失败。

## Not validated / Coverage Ledger

更多 Android/WebView Provider、DoL 版本、包装 App、Mod 组合、时间/活动/战斗分支、全部物品/衣物槽位和未知第三方 Hook 属于后续覆盖。MapleBirch/ModHub 专属 Integration 是可选增强。仅在用户要求、发布目标、真实问题或风险证据出现时升级为当前任务。

## Known limitations

- Provider 的源/对象/环境合同覆盖有限；普通未知 Passage 可重新理解，但没有可靠终止合同的动作仍拒绝派发。支持玩家自治不等于支持任意页面 JS。
- 时间合同目前覆盖已审同日早上及有限同小时/跨一小时分支；原生衣物覆盖简单 head，shop browse 覆盖已审头饰分类/物品和返回，combat radio 覆盖已审四类字符串动作选择。radio 回执证明选择生效，不证明战斗胜利。新场景生成未审 timed/repeat 任务仍可能拒绝。
- `reach-passage` / `native-state` / `native-knowledge` 暂为低层兼容谓词，包含实现名；不是完整稳定的玩家语义 API。版本变化通常由 Provider/合同消化，旧 Session 不自动迁移；尚未验证任意版本升级后继续未决动作。
- 两个旧目标仍有真实未决 effect：旧 UI 衣柜返回 `2c59c79e-6e9b-4193-9bd0-f8d65391864c`；旧离线 App 商店退出 `d63bddd7-3cff-49c1-8c25-4d74b62a2d91`。后者因清理 phase guard 放错阶段而失败，已修复并在独立 S1 App 原退出中验证，但旧 started/history/Engine 证据不足，仍阻挡该物理目标。未重放、重置或删除 ledger；旧对象/映射清理失败也保留。新目标验收不替旧目标结清。
- 现场文本和 Memory 是私有、有界、可能过时的解释。完成须有新原状态和必要的逐 attempt Outcome；一次 Evidence partial 不改变本版本交付状态。

本轮能力完成与有限覆盖分开；上述真实边界公开保留，不自动扩张为全生态验收。
