# DoL Dev Tools: Paisley Park 3.0.0 — Gold Experience

> 历史说明：此处记录当时的版本与验证。3.0.0/3.0.1 Release、tag 和原公开提交链已在 2026-10-08 按用户要求移除；当前入口是 README 与 3.0.2。

**历史发布说明，正式Release已于2026-10-06撤为草稿。** 原资产/tag保留作Foundation记录；下文不再是当前正式版或安装推荐。稳定版为2.0.1，新正式3.0需按[重新审计](GOLD_EXPERIENCE_REAUDIT.md)继续研发；见[撤版说明](WITHDRAWAL_3.0.0.md)。

本版在真实现场诊断与开发闭环之上加入有限游戏语义：Agent根据Goal理解场景与原选择，选择原动作，观察实际结果并动态重规划。工具复用Action/Journey/CDP/ADB，保存预算和结果记录，不新增AI引擎或业务状态镜像。

## 交付

- `game-observe`、`game-open-wardrobe`和持久 `game-goal-start/step/status`；支持reach-passage、equip与purchase-one。
- 明确目标/预算、原控件与对象守卫、派发前pending、未知结果不重放、新鲜原状态完成证明；正常事件/绕路由Agent自治，Journey只是片段。
- 不依赖SW的原DoL简单head商店单件购买映射，及显式选择的Soft & Wet UI 2.2.1/2.2.2衣柜映射。示例与精确字段见[GAMEPLAY](GAMEPLAY.md)。
- 更新Skill、命令入口、当前文档与验收账本；保留Generic/Optional分离、稳定诊断Schema 1、Contract 1及旧版本历史。

本轮真实Android上已完成衣柜、购买→返回→穿戴→恢复、普通中间页/绕路与受控工具源码前后复验。价格差异经原扣款机制调查与显式解释，不通过重复购买消除未知；不删除/覆盖存档、不赋回钱或库存。证据边界与后续覆盖见[收口](CLOSEOUT_3_0.md)，实际离线检查见[VALIDATION](VALIDATION.md)。

## 安装与更新

tag：`v3.0.0`。资产：`DoL-Dev-Tools-Paisley-Park-3.0.0.zip`、`SHA256SUMS.txt`。此为历史记录；该 Release/tag 已于 2026-10-08 按用户要求移除。新用户从[当前 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/latest)下载并核对 SHA256，解压到新的稳定目录，无需npm install。必需Node.js 22.12+；Android/CDP前提沿用[README](../README.md)。

保留旧Tools及完整Skill备份，然后用新包按[SKILL_INSTALL](SKILL_INSTALL.md)向空目录生成Skill，确认resolver与文档链接指向3.0.0。Windows入口为`Paisley-Park.cmd`，`DoL-Dev.cmd`仍是别名，Skill名为`$dol-dev-tools-paisley-park`。不自动迁移或恢复旧版本私有Goal日志；新任务读取当前原现场开始。

## 范围与限制

本轮约定能力Completed，生态覆盖有限。其它衣槽/商店/复杂服装与额外Mod机制不是已完成映射；真实业务由原状态证明，不由UI解释或采集complete代替。DOM click不等于trusted触摸，同步守卫不能物理约束未知Mod扣款、远端取消或保证exactly-once。私有语义日志的 `experimental:true` 表示不属于稳定公共诊断格式，不是产品完成状态。

正常Gameplay默认自治，删除/覆盖已有存档默认禁止。只有可靠观察丢失、持续无法解释或明确高风险边界才暂停。直接CDP/ADB/项目工具保留出口；Evaluator并非天然只读，Integration Worker并非权限安全沙箱。私有游戏资源、日志、截图、目标参数与存档不包含在公共包中。
