# DoL Dev Tools: Paisley Park 3.0.3 — Gold Experience Requiem

本轮 Done：按 UI 实战反馈改善 pending 可发现性、版本来源与安全错误定位，补窄幅 Skill 指引，完成发布/安装一致性。不是历史 effect 根因调查、UI 布局修复或新 Gameplay 覆盖。

## Delivered

- pendingEffects 是已有 openEffects 的有限只读投影；最多 32 项，标明 owner、动作类别及状态，省略跨 Session 正文与执行绑定。不修改 Session 核心、Store Schema、Safety、预算、effect、Outcome 或恢复 reader。
- versions / Environment 分别增加固定版本来源；保留原 gameVersion 读取政策，允许旧制品缺少新字段。标准 Support、Issue Report 和 Environment 投影只保留允许的来源值。
- CLI 对已审输入/前提错误提供固定 code / stage / field；未知错误保留 unknown。Action/Journey 对 name 的原拒绝仍在执行与输出创建前；未增加 checkpoint 字段或宽松回退。
- Skill 只澄清目标级 pending、实际事件承载区域、版本来源和错误阶段。直接工具出口、正常 Gameplay 自治与存档保护保持既有边界。

## Validated

76 项受影响 Node 检查通过：包含跨 Session 阻挡仍有效、原 effect / Store 状态不变、投影限额与私有字段省略、旧 Environment 兼容、来源展示与投影、错误阶段、已审字段和任意异常不泄露，以及既有未知结果不重放和缺依赖/Generic 独立性。

源码检查和发行/安装记录保留本地；既有真机证明复用 [S1/S2](CLOSEOUT_3_0_1.md#validated)，因为原游戏动作与终止合同未改，不重复实机路线。

## Not validated

新指引在未来实际使用中的收益、UI 对话未执行的购买业务、其它设备/版本/Mod，以及原未知 effect 根因。沿用 [Coverage Ledger](CLOSEOUT_3_0_1.md#not-validated--coverage-ledger)，不自动变成本轮阻塞工作。

## Known limitations

摘要可能截断，未知 metadata 仍为 unknown；不含跨 Session 叙事标签或完整私有绑定。CLI 只为已审错误提供精确信息，其余阶段提示不推断原因。版本来源是独立顺序观察，不能保证同一时刻一致；旧制品缺字段不代表游戏版本变化。

旧未决 effect 与 Provider 的已审支持范围继续按 [既有真实限制](CLOSEOUT_3_0_1.md#known-limitations)保留。本轮未连接真机、打开本机真实共享 Store、迁移 journal 或结清旧动作。
