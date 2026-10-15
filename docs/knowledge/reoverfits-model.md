# ReOverfits：保留原业务，也可以接入 UI 模型

状态：有后续实现与代表性验收的历史案例，2026-10-15 核对原报告。早期“仅完成探查，尚未实现 Adapter”不再代表当前历史成果；保留该阶段的证据限制，不将其改写为当时已成功。

## 判断如何改变

ReOverfits 4.1.1 的外层服装本身能按原生逻辑购买、穿脱，UI 分类却不认识新增槽位。初期保留原生列表的 Layout Safe 方案维持了功能，但没有提供正常 Vue 衣柜的体验。

后续确认原槽位定义、库存数组、穿戴对象和最终原生操作稳定存在。配套 UI 2.2.1-reoverfits.1 与 Adapter 0.2.0 用 `wardrobe.registerSlotMapping` 注册 `over_upper`、`over_lower` 和关联 `over_head` 的语义；复用现有卡片、搜索、详情和管理能力，不复制库存，也不接管最终 native.action。业务轻侵入不能自动推导为只能做样式适配。

## 已有结果与反例

历史独立 Android DoL 0.5.12.13 场景中，原购买扣款 4500，三个原库存各增加一件；配套 Vue 入口完成整套穿脱、剪开后独立下装出现、搜索与独立穿戴。撤销/重注册映射改变分类，原库存与 worn 状态保持不变。

一次失败断言选择了已经剪开的旧套装，却期待整套联动。核对原状态后，结果符合原规则；这是测试数据选择问题，不应修成复制库存或强行联动。另一个原生天气 Alert 的根因仍 unknown，不能归给此 Adapter。

## 下次如何使用

先核对当前 UI、Adapter 与原 Mod 是否配套，再检查稳定原数据和公开接入点。选择完整套装还是剪开单件，会改变正确预期。新增适配应证明原动作、双方功能与撤销后的状态，而不能仅凭无报错或禁用一方宣布兼容。

这些结果不证明全部服装、旧存档、设备和版本。也没有完整逐 Patch 执行链，不能据此认定某个 ReplacePatch/Linker 导致覆盖。若问题需要来源归因，另查真实规则和发布过程。

## 来源与访问限制

目标工程 `reoverfits-ui-model` 的 `compat/reoverfits-soft-wet/VALIDATION.md` 为后续直接依据；同目录 `VALIDATION_0.1.0_HISTORY.md` 保存旧方案。正式 UI 后续集成另见目标主工程 `docs/audits/reoverfits-2.2.1.md`，不能由候选报告代替。

原始记录在目标工程 `tests/artifacts/reoverfits-device/`，不随 Tools 分发。UI 候选 SHA-256 为 `1c192852fcba9a2a500757a531c2875b23f66b3fafbc0e4131149d8bd38d3576`，Adapter 为 `e37024e5cc73243789bad4de8a2f207507f477177d3034bf99ac4b3ce10e515d`；它们是特定候选身份，不是今天任意同名包的证明。
