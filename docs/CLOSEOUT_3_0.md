# DoL Dev Tools: Paisley Park 3.0 — Gold Experience 收口

**2026-10-06状态修正：本文为Foundation的历史收口。正式v3.0.0已撤回，不再代表正式Gold Experience完成。** 原能力/证据保留；用户新增的持续规划、记忆、事件、恢复与更强高层验收属于必需研发，见[重新审计](GOLD_EXPERIENCE_REAUDIT.md)与[撤版记录](WITHDRAWAL_3.0.0.md)。下方Completed仅限当时Foundation约定，不是当前正式3.0状态。

日期：2026-10-06。**约定能力状态：Completed；生态映射与兼容验证：Implemented, coverage limited。** 本轮Done是有限语义目标、正常事件重规划、原动作与结果验证、A—D代表性闭环，以及统一源码包/Skill交付；不是解析整个游戏或全业务回归。实际交付与检查见[发布说明](RELEASE_3.0.0.md)及[验证记录](VALIDATION.md)。

## Delivered

- 显式 `game-observe`、私有有限Gameplay选择与原商店视图；原Bedroom衣柜入口片段。
- `game-goal-start/step/status`：绑定设备/package/Android user，本地持久目标、时间/动作/观察预算、派发前pending、未知结果核对和引用证据的Agent解释。
- 原状态谓词：reach-passage、equip、purchase-one。明确Goal完成与路径完成；Agent可跨片段理解与重规划，复用现有Action/Journey/CDP/ADB。
- 独立DoL简单头饰单件购买/数量输入映射；可选Soft & Wet UI 2.2.1/2.2.2衣柜映射。原对象/价格/控件绑定与同步行动性守卫；不直接赋值钱、库存、穿戴或传送。
- 当前Skill、CLI、安装说明及发布包采用统一Paisley Park身份。Generic/Optional分层、诊断Schema 1和Contract 1保留；业务日志留本地，不自动进入Evidence/Support。

## Validated

| 验收 | 实际证明 | 范围 |
| --- | --- | --- |
| A 衣柜 | 原入口、分类、唯一发卡穿戴与恢复；原worn字段、选定head库存前后核对 | 真实M367FC Android、Lyra包装App 0.5.12.13、UI 2.2.1及2.2.2；恢复基线为未佩戴头饰 |
| B 商店 | 原分类/商品卡、原数量输入、一件黑/黑发卡送到wardrobe；目标变体0→1、原资金减少且在预算内；返回衣柜穿戴并恢复 | UI 2.2.2真实组合；报价与实际扣款不等，保留差异并通过当前原扣款路径解释后完成；没有重复购买 |
| C 修改前后 | 两份隔离Git源码包分别执行相同穿戴/恢复Goal，四次均一步完成；前/中/后选定库存/穿戴摘要与资金、UI、Mod组合保持一致 | Paisley Park源码 `c681890`→`45464d6`，实际Node CLI执行；五个已加载UI/兼容包JS/CSS摘要匹配现有制品。这不是新增APK部署 |
| D 重规划/真正暂停 | 实机Bedroom→Kitchen→Orphanage中间页→Bedroom→Wardrobe自主继续；不可操作原anchor拒绝派发后核实实际原卡片；未知输入/价格差异先核对不重放 | 定向夹具另验证普通事件、预算、原对象/场景漂移、断链、已知存档破坏与可选映射缺失；不宣称所有随机事件均实测 |

有效既有平台证明复用：Generic无SW诊断、Android/CDP/ADB、原生与WebView重建、目标项目Mod/APK构建部署、重型采集及清理，见[1.5最终验收](FINAL_ACCEPTANCE.md)。3.0没有重跑未改动的原生/重型路径；夹具中的无SW语义读取/购买不依赖SW对象，不冒充新的无UI真机购买证明。

UI 2.2.1→2.2.2同白色发卡目标补充复验通过，但期间资金/库存与兼容包变化，只是部分可比证据。C采用同环境Tools源码更新，未将该UI升级冒充完全受控比较。私有stage1/2/3失败、观察、Goal与对比收据留在忽略目录，不随源码发行。

## Not validated / Coverage Ledger

| 覆盖项 | 状态 | 何时提升为任务 |
| --- | --- | --- |
| 更多Android、Provider、包装App及Mod组合 | Additional coverage | 新目标或真实兼容问题 |
| 新语义在无UI实机的完整购买/穿戴 | Not validated | 有该目标需求；Generic及无SW夹具证明仍有效 |
| 其它衣槽、商店、免费物品、花纹/自定义色、套装/诅咒、其它货币hook | Future mapping / coverage | 明确短目标及原行为审阅；不自动扩大本轮 |
| MapleBirch/ModHub等专属Gameplay/诊断增强 | Optional Integration | 真实项目需要；Generic现已可用 |
| 更多随机事件、战斗、复杂动画、权限弹窗及业务场景 | Additional coverage | 当前任务所需或出现真实问题 |
| 更多第三方Skill与自动提示触发效果 | Future coverage | 具体能力缺口；优先复用已验证工具 |

以上不是本轮Remaining work，也不代表已经实现所有这些专属映射。用户明确要求、发布目标、风险证据或真实问题出现后，再定义新的Done。

## Known limitations

- 原控件使用DOM click/input，不证明trusted触摸；同步守卫非原子事务，不保证exactly-once、远端取消或游戏回滚。Goal目录锁不提供设备级跨会话互斥。
- 当前映射支持有限场景；通用intent只是动作用途，不代表每种玩法都有业务验证器。新普通页面由Agent读取理解，缺映射可使用现有可靠直接工具出口。
- 原报价不是其它Mod扣款上限。购买前审阅当前扣款路径；工具绑定并摘要原money函数/handler，但摘要不是语义审阅。实际差价必须保留并解释，不能自动当优惠或重放。
- equip只证明请求的原穿戴字段，库存比较须另行采样；本轮仅证明未佩戴head基线恢复。资金/新购商品保留，未写入或覆盖存档。
- 私有Goal日志保留 `experimental:true`，版本绑定，不是诊断公共Schema或跨版本恢复协议；哈希也不承诺匿名。GameVersion来源仍可unknown，包装App版本单独记录。
- Integration是reviewed local code，Worker不是权限沙箱；Evaluator能执行传入JS，“只读”是Probe/工作流约束。

后续开发使用[Gameplay工作流](GAMEPLAY.md)和[通用可复用路径](CLOSEOUT_1_5.md)。正常Gameplay默认自治；未授权删除/覆盖已有存档默认禁止；只有失去可靠理解或触及明确高风险边界才暂停。
