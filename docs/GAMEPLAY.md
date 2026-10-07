# DoL Dev Tools: Paisley Park — Gold Experience Requiem 工作流

当前版本 3.0.2 Gold Experience Requiem提供共享 Gameplay Runtime 与宿主 Decision 协议。Agent 理解当前原生 Scene、选择动作与动态重规划；Tools 持久保存 Goal、Memory、预算、Effect Ledger、checkpoint 与 Outcome，协调同 Session 中断恢复。S1/S2 代表性实机验收与本轮维护检查见[收口](CLOSEOUT_3_0_2.md)。原 v3.0.0 Foundation 已撤回；本页后半保留旧接口作为明确历史，不能用旧 journal 模型解释新 Session。Gameplay 私有记录不属于 Generic Schema 1，不自动跨版本恢复或上传。


## 当前 Runtime 与冻结 Foundation 的区别

3.0.2 的 `game-goal` 使用共享 XState/SQLite 核心，以下旧接口说明保留为冻结 Foundation 历史。Gameplay 需要根目录 `npm ci --ignore-scripts --no-audit --no-fund`；Node 22 运行时加 `--experimental-sqlite`，Windows launcher 已包含，Generic 可独立使用。参见[共享核心设计记录](GOLD_EXPERIENCE_REAUDIT.md#10-m2共享内核迁移进展)。

### 版本与语义边界

[game-semantic](../scripts/lib/game-semantic.cjs)只定义共享玩法意图；当前Goal解释由宿主Decision与Capability Provider组合完成，它不是已经实现的完整地点/活动/资源语义模型。[game-dol-provider](../scripts/lib/game-dol-provider.cjs)负责具体SugarCube/Mod场景与控件读取、DOM风险识别、视口准备及共享Action/Journey接线，也保留旧`game-open-wardrobe`入口。`game-goal`只调用该现场Provider，已不构造DOM执行占位；实际动作必须由当前Capability Provider重新解析、验证，解析失败不回退点击占位。CLI、semantic.json、Session格式及旧effect合同不变。

`reach-passage`、`native-state`与`native-knowledge`保留为低层 compatibility API，明确包含当前实现的 Passage/原字段/集合名；这不是长期 Gameplay semantic API 的最终形态，也不代表弃用或要求迁移旧 Goal。后续有实际需求时，在Provider中映射地点、活动、资源、角色状态或交互目标；仅改名而仍透传原字段没有收益。新语义目标不能原地改写既有Session的Goal。具体读取/领域谓词、版本指纹和接收合同由原生或领域Provider维护，不向Session/Planner/Memory/Ledger增加版本分支。

版本更新原则上改现场/领域Provider、Adapter与执行/Outcome合同；不因新增Passage向核心增加专用handler，也不以有限逐场景指纹证明跨版本玩法能力。未知普通场景先读现场、理解动作与原行为，选择有可靠Outcome的能力；尚无安全结果合同不能靠模型置信度派发。恢复保留旧attempt发生时的完整binding与证据边界，新Provider合同不能无依据追认旧effect成功或未发生。缺失/不匹配仍pending，无盲目重放。

### Provider/profile维护边界

本轮检查未发现新增普通 profile 必须复制整段执行器的要求。已有复用路径：

| 工作 | 已有入口 | 新能力负责的部分 |
| --- | --- | --- |
| 现场/候选发现 | `game-dol-provider` 的 gameplayReader、`game-capabilities` 组合 | 有界领域事实、Goal predicate、候选语义 |
| 原控件/源码/词法对象绑定 | `game-native-control`、`game-native-navigation.attest`、`game-contract` | 受审原 payload/函数/身份与版本 metadata |
| 原 Scene transfer | `game-native-generic-landing.review`、`game-native-profile` | 特殊业务接收分支、局部时间/环境条件；普通导航不增加每 Passage handler |
| 同页业务绑定 | `game-native-business-bindings.bind` | 领域 profile 的函数/closure 列表和独立 Outcome 事实 |
| 动作/历史/时间/清理 | 共享 Action/CDP、`game-navigation-operation` 及 history/time/render-task 合同 | 审查是否符合已有生命周期；不复制连接/派发/轮询/预算代码 |
| Outcome 读取与结清 | `game-receipts.recover`、`game-capabilities` 回执路由、共享 Runtime/Ledger | 自己的逐 attempt terminal evidence 和 receipt 校验 |

新增领域 Provider 在 `game-capabilities` 显式接入 Goal/动作/绑定路由；当前不是自动发现插件平台。普通源/profile 变更优先补局部定义和 branch/事实校验；只有现有共享合同无法表达真实行为才增加对应执行/终止合同，并验证它。不要为了代码形式相似合并不同生命周期：同页业务要求 active 身份保持，跨 Passage 要核对新 moment，两者 guard 不能直接互换。

复用 helper 只减少重复实现，不替新业务背书。新合同需要新绑定；旧未决动作仍按旧合同恢复。已有 `game-capabilities` 的领域独立/绑定拒绝检查和 `game-native-profile` 的特殊 payload 不降级为普通导航检查可作为受影响回归入口，不自动重跑所有场景。

新Goal默认使用本机`LOCALAPPDATA/PaisleyPark/sessions-v2.sqlite`（无LOCALAPPDATA时使用home/PaisleyPark）；测试可显式`--store ABSOLUTE_SQLITE`，该隔离Store不与其它Store共享阻挡。新goal.json是Session链接，status输出当前Decision与预算；旧goal.json只读历史。step可`--resume yes`显式重绑；不重新计算timeout/次数/消费上限。旧`--reconcile`/`--evidence`模型解释解除方式不再支持。原生Provider已接入有限本地prepare；其它Provider缺少准备入口及显式受审本地Outcome reader时，dispatch在创建effect前暂停为`reviewed-action-outcome-unavailable`，零点击，不增加动作次数或派发后观察收费；正常pause清除proposal，需新观察后重新提案。已有已派发但无终止证明的effect仍pending，不能为了继续测试手工删SQLite/清ledger。本地reader是开发代码入口，不是CLI/Proposal可声明的权限；返回空结果仍不能结清effect。

新请求可选顶层`description`（非空、最多512字符、不含控制字符），保存原高层目标说明，供当前及新宿主理解目的；`name`仍是1—64字符短标识。未提供时保留旧name作为描述。该文字沿已有不可变Goal配置持久化并进入Decision Request，resume不改写它；它不增加动作权限、不改变预算或形式谓词，也不提供新的活动历史断言。宿主应根据原说明选择有意义的动作，完成结论仍明确区分原状态/受审Outcome证明与文字解释。目标变更需新授权及新Session，不能借Proposal或现场文字重写原Goal。

开发中的内部Native Operation复用已审原UI穿戴/脱下入口、共享Action/claim和attempt回执；它不开放任意JS Action字段。当前限定profile已完成本地合同审阅；真实只读attestOnly仍只证明对象/源码绑定，不证明动作或完整Gameplay通过。缺失、started或不同context的receipt通常保持未知，恢复不初始化/修补receipt、不重放。一个旧合同的started结果另有受审的只读原状态/刷新结束证明，保留原失败及started历史；它不是对任意未知动作的通用放行，详见[候选进展与限制](GOLD_EXPERIENCE_REAUDIT.md#native-operation候选与终止回执)。

原生导航库现有内部`prepare(client, descriptor, goal, attemptId, reviewEnvironment)`：绑定实际原控件、源码、词法目的地、目标环境、共享Action及attempt回执。`reviewEnvironment`必须是受审本地代码，其远端引用归准备阶段的同一object group；不是CLI/Goal/Proposal可传入的JS或权限声明。同步guard与operation复用同一个preflight，回执容量/重复attempt、原状态变化、Engine忙、task registry及observer无法安装均在操作开始前拒绝；操作开始后的失败仍unknown。准备或清理失败分开报告。有限环境profile已启用，未审目的场景或payload仍在准备阶段拒绝；只读准备验证本身不证明动作或S2。

环境guard为同步、只读的本地合同：无返回值表示仍符合已审条件，任何返回值或异常表示不符合。它在派发前及原Addon业务Promise结束后分别以`before`/`after`检查；后一次拒绝保留started/unknown，不能签terminal或回退为未派发。跨转换应保持的环境/源身份与接收场景资格分开检查，不重查已离开的旧节点；来源场景不自动获得接收场景资格。实际场景、正常重定向与Goal Predicate仍独立判断。已审guard在同一owned object group内编译并核对源码，作为函数参数传入共享operation，随同其它绑定清理；contract保留源码与传输版本，Action源码上限不变。这不是CLI/Proposal自定义JS入口。

原生导航复用 source epoch、原控件/词法目的地、原共享 Scene transfer 合同；不要求每个普通 Passage 有新 core handler。具体活动和特殊 payload 仍由 Provider 的有限 profile 校验，不能借普通导航合同绕过未审业务。已审原生路径包括首入卧室、厨房/浴室/花园日常活动、普通街道、教学与事件继续、商店和衣柜进出，支持边界由当前源/对象/环境决定。空 payload 允许原 createShadowWrapper 的 literal null 回调，缺失/undefined 仍拒绝。回执证明真实有界 history 新 moment、裁剪规则、五阶段、原 Addon Promise 和原状态；State.turns 饱和后可不变，不能当单调回合编号。当前支持历史末端、2—128 槽和最多 1024 expired 标题；历史回退等分支未审。失败 started 不会因新合同、Goal 真或重启自动结清，旧未知结果见[收口限制](CLOSEOUT_3_0_1.md)。

屏外原生控件可作为scrollEligible候选，仍沿同一web-click执行链。标准act只为当前唯一、安全、非报价且有效祖先可见的屏外节点准备视口；滚动后原节点、场景与钱和时间状态必须保持，并重新满足命中检查。点击guard使用重新核对的完整Scene，准备失败时不点击、不重试。隐藏、禁用、遮挡及歧义Overlay不会因“可滚动”放行。

时间见证由受审本地Provider指定1—59分钟，时长及跨小时接入不是CLI/Proposal可随意附加的执行参数。同小时推进观察原passTime/minutePassed四个call回调；已审同日跨一个小时的分支观察八个回调：先推进到整点、原hourPassed(1)、剩余分钟（可为0），再返回原passTime。两张空Hook表、实际runCallback接收者、raw Time/原词法Time、hourly原函数与其实际statChange方法均须保持源码和身份；原get/set不替换。按原参数及顺序观察，额外小时/日期回调、Promise返回、缺失尾部或恢复冲突不能产生terminal。observer安装/恢复仍共用navigation operation；原状态增量必须等于指定分钟数×60秒，并满足原history、生命周期及Addon尾部。当前跨小时接收只审第一天早上7—11点的有限常规分支，活跃NPC/怀孕等未审分支、午间、跨日及未知第三方时间Hook仍拒绝。本见证不宣称所有页面异步活动静止。一分钟、五分钟刷牙、30分钟寻找种子和首个跨小时40分钟劳动已有真机terminal；完整任务及更多时长状态见审计记录。

### 宿主 Session 协议

跨宿主时也要重新核对实际命令进程环境。如果ADB不在PATH而使用DOL_ADB，且执行工具每次新建shell，应在每次CLI调用的同一个shell中设置该变量。之前一次调用的临时环境不会自动传给下一次调用。采集失败尚无App/CDP元数据时，先区分工具环境、手机电源/前台与真实场景问题；保留失败和已计观察预算，不通过新Session或预算重置隐藏失败。

原生知识目标可读取受限原集合成员并要求返回，例如`{"kind":"native-knowledge","collection":"plants_known","entry":"daisy","passage":"Bedroom"}`。目前只允许`plants_known`，entry为1—128字符；不接受任意变量路径或写入操作。只返回指定成员是否存在，不导出整份知识集合；原集合缺失、类型错误或超过512项为unavailable。成员存在及返回场景同时成立才满足目标。这证明当前原知识状态，不自动证明曾执行特定寻找动作；实际活动仍需关联原Outcome，接收合同和S2验收也不因新增谓词而完成。

原生日常活动profile另支持已审第一天的Bedroom→大厅（按原daily.homeEvent选择普通事件或已结束分支）、大厅→Bathroom、Bathroom→Bathroom Brush、刷牙场景原继续与Bathroom→Bedroom。随机活动仍由原游戏事件池选择；绑定原widget/function macro、事件池词法函数、RNG与State对象，最后由相同Action、History、时间和生命周期见证结清。宿主选择当前候选并维护临时事件/返回目标，没有新增日常活动控制器。此有限接收合同不证明其它时间、版本或所有活动，也不以hygiene初始为0冒充曾执行清洁活动；真实短路径见[日常活动记录](GOLD_EXPERIENCE_REAUDIT.md#m5准备原生日常活动真实短路径)。

花园/花坛/寻找雏菊也作为native Provider的有限接收能力接入同一链：原生大厅→Garden一分钟、Garden→Garden Flowers空payload、原寻找种子payload更新plants_known并推进30分钟，之后使用原继续/离开/大厅/卧室入口返回。这里只审第一天早上7—11点、空白或仅耕作的三块花圃及既有非空头饰分支；普通40分钟耕作另有有限合同，不是所有耕种或花园事件的支持声明。寻找活动会执行原游戏的特殊物品解锁刷新，相关原函数、词法helper与有限条件函数族按源码和身份核对；采集不调用这些函数，原业务仍由原控件执行。30分钟已有真实terminal，状态Goal由原plants_known成员读取，二者分别证明活动发生与当前知识状态；耕作复用同页navigation operation，在原接收尾部核对已耕空苗圃数量恰好增加1，保留原体能/疲劳副作用并读取原physique目标；已完成的苗圃会呈现种植选择，宿主必须据新Scene重规划，不能复用旧耕作引用。新宿主与完整S2状态见[当前验收](GOLD_EXPERIENCE_REAUDIT.md)。

原生 DoL Gameplay Runtime 是中心；衣物是领域 Provider 和 S1 副作用场景。S2 已以原生劳动、普通导航、连续运行、同 Session 恢复与无旧聊天新宿主证明不依赖 Soft & Wet 私有 Runtime、衣柜 Adapter 或 UI Mod 能力。新的场景/事件/导航/对话/战斗能力继续从原生 Gameplay 设计。

原生 Goal 还支持状态条件与可选返回场景，例如：

```json
{"kind":"native-state","passage":"Bedroom","conditions":[{"field":"timeStamp","op":"gte","value":1311350},{"field":"hunger","op":"lte","value":100}]}
```

条件为AND，1—8项；field只接受hunger/thirst/tiredness/stress/hygiene/physique/money/timeStamp，op为eq/lte/gte，value为绝对值≤1e12的有限number。数值单位来自当前原游戏，示例不代表当前目标或现场。读取缺失/非数值为unavailable，不能当0；最终满足不证明曾执行某项活动，初始满足可以直接完成，pending effect仍阻止Session完成。消费和期限独立受父预算限制。原生数值Goal的路线进展要求全部条件不退步且至少一项改善，资源取舍可能记未进展；这不是完整振荡检测。只读谓词本身不证明活动发生；S2 由独立原活动 Outcome 与同 Goal 连续路径证明。

新宿主使用同一个`game-goal-start`创建Session，随后使用`game-session --goal DIR --operation ... --test-environment yes`。这不是第二执行引擎；propose/dispatch/恢复共用原Action/Journey和effect ledger。S1/S2 同 Goal 代表性验收已通过；正式包及本机安装按 3.0.2 收口记录核对。

```powershell
# 初次创建；REQ/PROPOSAL/DIR 等路径与设备参数须换成当前目标
node --experimental-sqlite scripts/dol-dev.cjs game-goal-start --file GOAL_JSON --serial SERIAL --package PACKAGE --out NEW_GOAL_DIR --test-environment yes
node --experimental-sqlite scripts/dol-dev.cjs game-session --goal GOAL_DIR --operation request --test-environment yes
# 从刚返回的 Request 选择当前完整 ref 和 Decision 版本字段，写入 PROPOSAL_JSON
node --experimental-sqlite scripts/dol-dev.cjs game-session --goal GOAL_DIR --operation propose --file PROPOSAL_JSON --test-environment yes
# 仅 propose 成功且当前授权/绑定仍有效时派发
node --experimental-sqlite scripts/dol-dev.cjs game-session --goal GOAL_DIR --operation dispatch --test-environment yes
node --experimental-sqlite scripts/dol-dev.cjs game-session --goal GOAL_DIR --operation status
# 接管既有 Session：先显式 resume，再用新 Request 决策，不能再次 start 替代它
node --experimental-sqlite scripts/dol-dev.cjs game-session --goal GOAL_DIR --operation resume --test-environment yes
```

| operation | 行为 |
| --- | --- |
| request | 收费读取新原现场，返回当前DecisionRequest；不点击 |
| propose --file JSON | 整体接受当前request/version/epoch的计划与动作引用；不点击 |
| dispatch | 有准备/结果路径才派发当前动作；路径缺失在创建effect前暂停；已派发但结果未闭合的效果仍pending |
| resume | 显式重绑并重新观察，保留原Goal、预算、计划、belief及路线记录；旧决策失效 |
| reconcile | 仅对已停止或观察额度/期限耗尽的本Session未决effect，收费读取受审终止结果；不派发、不恢复Goal执行 |
| checkpoint --file JSON | 开发模式读取新原现场并验证约定断言，失败永久保留 |
| cancel | 停止Session并释放lease，保留未决effect |
| status | 本地读取当前状态；此操作不需要test-environment标记 |

`reconcile`在I/O前预约并持久化一次独立清理读取，最多8次，跨宿主不重置；失败也收费，第9次不读取。读取共用一个30秒受限CDP transport，迟到结果拒绝，resume/新预约/lease换代使旧预约失效。不强占其它活跃Session，不改变原deadline、动作/观察/消费预算；结清仍验证原attempt、终止事实及实际消费。成功也保持原停止原因和halted，不重新计算Goal完成。`status.reconciliation`显示次数/失败，`budget.actualSpendExceeded`保留停止后的真实超支事实。CLI不接受用户提供的结果文件或JavaScript；特殊恢复reader只能是审阅过的本地代码，不能据模型解释清除pending。

`status.pending` 汇总当前物理目标所有未结清 effect，不限于当前 Session。历史 completed Session 后来看到 pending=true，可能是同目标的新 Session 留下未决动作；须按 effect.sessionId 和原 attempt 区分，不据此改写旧验收或绕过当前目标阻挡。status 本地读取不证明现场仍满足旧 Goal。

Proposal复制当前Request的`protocol/requestId/sessionId/bindingGeneration/epoch/revision/planRevision/memoryRevision`，提交`actionRef`、简短`reason`、最多8条`plan`及最多16条`beliefs`。每条belief为`{claim,sourceEpoch}`，只承载宿主解释。宿主选择当前候选引用，不传selector或JavaScript；连接、目标绑定、解析和最终guard由既有执行链负责。现场文字不授予权限。迟到/重复响应整体拒绝，不部分写入Memory。

生成Proposal时从同一份Request对象复制版本字段，并从宿主选定的当前choice对象提取完整`ref`；不要手工重打或拼接hash。提交前可本地检查`actionRef`属于该Request的choices。拒绝后先核对Proposal与当前Request、租约及版本，不直接dispatch；有证据修正后使用同Session的新Decision，不重置预算或放松执行校验。

Proposal还可提供有界`cognition`快照：`subgoals`最多8条`{id,description,status,sourceEpoch}`（status为active/blocked/satisfied），`events`最多4条`{id,description,sourceEpoch,returnTo}`。事件按数组顺序组成栈，最后一项是当前事件；returnTo指向同一快照中的子目标id，null表示回到不可变的原Goal。示例：

```json
{"subgoals":[{"id":"return-home","description":"完成原目标的返回条件","status":"active","sourceEpoch":12}],"events":[{"id":"ordinary-detour","description":"先处理当前普通事件","sourceEpoch":12,"returnTo":"return-home"}]}
```

epoch必须来自当前Request，示例12不是现场值。省略cognition保留已有上下文，显式两个空数组才清空；出栈与返回计划放在同一Proposal中接受，未派发旧动作。已有旧条目可以原样保留其sourceEpoch；新增、修改或重新核对的解释使用当前epoch。Request/status的`needsReview`由core计算，是只读标记，不能用false把旧来源变成新证据。成功观察（包括同页同时间）、恢复、开始新观察或派发、暂停/停止都会使旧解释待复核；失效更新Memory修订号。旧Session在新代码中补空上下文，不承诺冻结二进制理解新增语义。

宿主恢复时先读取原Goal、累计预算、事件栈及returnTo、子目标、路线和新Scene，重新核对待复核解释，再提交下一短计划。子目标satisfied仍是宿主解释，不能使原Goal完成、结清effect或代替开发checkpoint；Runtime不自动执行出栈后的返回路线。

新增条件Goal示例：

```json
{"name":"black-head-at-home","mode":"gameplay","goal":{"kind":"equip-matching","slot":"head","colour":"black","passage":"Bedroom"},"budget":{"timeoutMs":600000,"maxActions":32,"maxObservations":96,"maxReplans":64,"maxSpend":0}}
```

原条件不绑定Agent后来选择的variable；最终须同时满足原颜色、简单非诅咒非联动头饰及返回Passage。只读取原head槽的有界库存/穿戴，最多64个唯一身份候选；重复身份不猜测。Soft & Wet衣柜解释可额外提供语义equip候选，缺失时原事实和普通候选仍可用。此示例是条件穿戴，**尚不是完整条件购衣返回穿戴Goal**。已有purchase-one只在当前原variant、数量、目的地、价格、资金、容量与baseline一致时提供带quote的购买引用；已识别的商业控制不作为零成本menu派发。此规则不宣称能识别任意第三方代码的隐藏消费。

衣物 Provider 可在无 UI Runtime 的原生 Wardrobe 生成 `dol-wardrobe` 候选；当前受审范围仅原生 0.5.12.13 简单 hairpin/beanie 的 head 穿脱，完整变体唯一、原刷新分支/控件来源符合合同才执行。与 `sw-wardrobe` 共用 Session/Action 和账本，各绑定仅用于对应实现。原 updateMoment、库存/穿戴/历史提交与 fresh list 证明业务完成，不证明 Canvas 显示尾部。未受审衣物省略领域候选，原 Scene 仍可观察。S1 已在同一 Goal 中证明购买、事件绕路、返回、穿戴和最后原状态；不是拼接独立片段。

`purchase-and-equip` 保留条件目标，不绑定后来选定的报价：

```json
{"name":"buy-new-black-head","mode":"gameplay","goal":{"kind":"purchase-and-equip","slot":"head","colour":"black","passage":"Bedroom"},"budget":{"timeoutMs":900000,"maxActions":48,"maxObservations":144,"maxReplans":96,"maxSpend":100000}}
```

用户只给条件和父预算，不能把选品、报价或基线塞进这个Goal。当前只针对已审简单hairpin/beanie：原商店Scene生成完整variant/报价/原金额及库存、穿戴基线；同variant原有总数必须为0，避免虚构物品实例ID。Host只能引用候选，prepare持久化该quote并在实际guard重查。商业终止合同的原实际扣款和数量增量作为独立`evidence`随effect结清；quote、ack、最终“穿了黑衣服”均不能替代购买见证。累计消费来自已结清账本，第二次购买在事务内拒绝，权威not-occurred才允许重新选购。

新Request的`outcomes`保留本Session已结清attempt、实际消费和受审见证，供无旧聊天的新宿主理解。最终判真发生在同一observe事务结清之后：原条件、完整选中variant、原库存/穿戴总数1、返回地点、页内context连续性和父预算都须成立。原库存计数独立于可装备候选筛选；截断或未知不是0。`view.proof.satisfied`为这个组合判据，原页内reader只提供条件事实。购买后不提供load-save动作；更换页内context或已检测的时间回退不能把旧见证拼接为新游戏状态证明。同页外部载档/未经跟踪的状态替换尚无连续性合同，不能据旧见证继续验收。

**S1 同 Goal 真实闭环已验证。** 原 `dol-shop` 支持受审的 `buy-one`、零成本 `browse` 与 `return-menu`。browse 使用当前候选的 `{type:"dol-shop",operation:"browse",selector:CURRENT_SELECTOR}`，覆盖原头饰分类与简单物品；return 使用 `{type:"dol-shop",operation:"return-menu"}`，每次只退出一个当前菜单层。二者保持钱、库存、穿戴、原 history/time/turns 不变；购买仍为独立报价/终止合同，不能包装为 menu。原生当前默认完整 variant 可直接购买，未审颜色/数量修改不自动支持。候选不足或源不匹配时拒绝准备，不通过直接写变量补齐。具体 S1/S2 结果与旧未决失败见[收口](CLOSEOUT_3_0_1.md)。

Combat 当前接入受审原 radiobutton 的字符串选择（leftaction/rightaction/feetaction/mouthaction）。实际原 change handler 执行，验证选择值、其它原变量与历史/时间/金钱稳定；该回执只证明选择，后续原 turn/导航须另有 Outcome。不支持任意表单、所有战斗分支或胜利断言。普通场景仍共享导航合同，具体业务由 Provider 审查。

原 timed/repeat registry 的受审清理合同在 passageinit 检查旧任务，后续 phase 验证原 Engine 已清理；工具不代替原游戏取消任务。新接收场景产生未审任务仍拒绝。旧错误 phase guard 导致的 started 保留，不能用修复后的新目标结果结清旧动作。

开发衣柜检查可以使用同一条件Goal，`mode:"development"`并声明`requiredCheckpoints:["starting-wardrobe","original-equipped"]`。分别提交`{"name":"starting-wardrobe","predicate":"scene-passage","passage":"Wardrobe"}`及`{"name":"original-equipped","predicate":"goal-satisfied"}`。检查由新原观察决定，不接收模型传入的passed。必需检查未通过不能complete，失败不能由恢复/换路线/后来Goal达成覆盖；检查点也会使旧Decision失效。

Gameplay私有Scene现在含最多2048字符、最多256条非空可读片段的可见叙述（遍历最多4096个文本节点）及有界控制标签，排除form/save-list/input值；Generic Evidence仍不采集这些游戏上下文。路线记录保存最近16个已结清attempt及原现场/目标进展摘要，恢复后可读取；同一现场/同一动作反复3次无原Goal进展时不再提供该路线，宿主可选择其它当前动作。新事件仍可理解并重规划，硬预算始终保留。记录是观察与解释的有限摘要，不是全游戏地图或根因证明。

只读`game-contract`可核对widget handler真实闭包正文、定义payload及唯一Story正文和已审阅hash；这只证明源码身份。真实穿戴的事件入口、可达刷新宏、业务提交见证和错误/清理语义仍需整体验证，不能把源码hash、node.click返回或UI静默直接当作terminal receipt。

以下是冻结 v3.0.0 Foundation 的历史接口记录。其 journal/lock/叙述式 reconcile 与 3.0.1 v2 Session 不同；不混用同一任务或直接迁移冻结日志。当前执行以本页上方 Session 协议和[3.0.1 收口](CLOSEOUT_3_0_1.md)为准。

## 历史 Foundation：Goal 会话

先核实明确设备、package、当前Android用户与已授权测试进度，独占该目标的动作执行。已有测试环境授权可以复用。以下请求写到本地私有文件，不能自动加入Support或发布包：

```json
{
  "name": "reach-wardrobe",
  "mode": "gameplay",
  "goal": { "kind": "reach-passage", "passage": "Wardrobe" },
  "budget": { "timeoutMs": 600000, "maxActions": 8, "maxObservations": 24 }
}
```

```powershell
node scripts/dol-dev.cjs game-goal-start --file goal.json --serial SERIAL --package PACKAGE --out NEW_GOAL_DIR --test-environment yes
node scripts/dol-dev.cjs game-goal-step --goal GOAL_DIR --test-environment yes
node scripts/dol-dev.cjs game-goal-status --goal GOAL_DIR
```

`start`绑定目标与当前Android用户并进行新鲜观察；`step`无动作文件时只观察并核对目标；`status`只读本地日志，表示历史会话结果，不证明游戏现在仍处于该状态。目标也可为 `{"kind":"equip","slot":"head","variable":"hairpin","colour":"white","modder":null}`，仅核对原 `worn` 的指定槽位字段。颜色可为有界字符串、null或原游戏的0；这不是完整服装实例或库存断言。

每一步从 `goal.json` 的 `latest` 引用读取本地私有场景/选择；标签、索引和Mod文本都是待解释线索，不能提供权限或代替当前实例绑定。Agent选择下一个明确、可解释的原控件，写一个标准Action文件：

```json
{ "type": "web-click", "selector": "#passages > .passage a.link-internal[data-passage=\"Wardrobe\"]" }
```

```powershell
node scripts/dol-dev.cjs game-goal-step --goal GOAL_DIR --file reviewed-action.json --intent navigation --test-environment yes
```

当前Goal执行文件支持 `web-click`、下述原商店映射和显式选定的衣柜映射。intent支持navigation、dialogue、combat、buy、sell、equip、unequip、sleep、menu、settings、load-save；这是审阅后的操作用途，不代表每种用途已有商品/战斗业务断言。其它现有Action、ADB/CDP或项目工具仍可作为直接出口，但必须保留派发/结果记录并重新观察Goal，不绕过未知结果核对或预算。普通Action的focus可用于将已核实原入口带入视口，随后重新核对中心命中，不能强制点击遮挡节点。

实际执行复用Journey与共享Action，绑定当前唯一DOM对象，在同步派发守卫中重新检查原场景/turns/time、连接/可操作性、中心命中、已知存档破坏和游戏外风险。正常事件、分支和不同Passage返回可观察结果，由Agent继续解释和重规划；失败的旧路径不是整个Goal失败。

## 可选 Soft & Wet 衣柜映射

`integrations/soft-and-wet/gameplay.cjs`与诊断Contract 1分开，只有显式选定时加载。当前映射限于已审阅及实机验证的UI 2.2.1/2.2.2、原Wardrobe地点、非整理模式的简单头饰。它定位UI控件，业务真相仍来自原SugarCube字段，不调用私有业务函数、不写穿戴或库存变量。

以下分别是切换头饰、穿上唯一白色发卡、脱下当前头饰的文件内容：

```json
{ "type": "sw-wardrobe", "operation": "select-slot", "slot": "head" }
```

```json
{ "type": "sw-wardrobe", "operation": "equip", "slot": "head", "variable": "hairpin", "colour": "white", "modder": null }
```

```json
{ "type": "sw-wardrobe", "operation": "unequip", "slot": "head" }
```

依次使用 `game-goal-step --file FILE --intent menu|equip|unequip`。动作不是固定顺序宏：已处于目标槽位时无需再次切换；先检查当前真实控件及目标状态，再选择下一步。不要用这些示例擅自把用户的目标商品换为发卡。

目标物品按原槽位的variable/colour/modder唯一匹配，可增加 `accessoryColour` 核对配色；equip Goal同样可增加该字段。未请求的字段不作为目标谓词，精确配色任务应明确提供配色。绑定原物品与当前穿戴对象；同外观替换、重复物品、关联套装、自定义颜色、诅咒、错误槽位或未知UI版本不派发。UI的data-key只是当前控制映射，不能独立证明物品实例。没有映射时返回unsupported，Generic观察仍可用，Goal可以改用另一条经过核实的路径。

恢复原穿戴是另一个游戏动作与Goal，不是资源cleanup。本轮已验证未佩戴头饰→白色发卡→未佩戴头饰；不能把这一例推广为任意套装恢复。需要库存验证时显式读取选定原槽位的有界前后事实，Goal的 `equip` 谓词本身仅证明请求的穿戴字段。

## 原商店的一件购买

`scripts/lib/game-shop.cjs`不依赖Soft & Wet，使用原商店ID、原选中描述、原控件事件和原资金/头饰库存。目前只支持原Clothing Shop的简单head商品、确定主/配色、无花纹/关联套装/自定义色/试穿、送到原wardrobe。先由Agent通过实际分类与商品卡选择目标，再读取：

```powershell
node scripts/dol-dev.cjs game-observe --serial SERIAL --package PACKAGE --out NEW_DIR --gameplay yes --shop yes
```

`shop`是明确选择的私有原商店事实，不进入Generic Evidence/Support。只读返回选定variable/modder/颜色、数量、目的地、原报价、资金、容量和该变体库存数；不导出完整库存。上下文不支持时保留普通观察与shop unsupported。报价函数只调用所选0.5.12.13目标中已审阅、指纹匹配的原getClothingCost，绑定并复查原函数实例；该指纹不证明整个游戏或所有Mod的业务代码身份，也不是权限沙箱。

例如下列私有Goal表示买一件指定变体，最多消费500原游戏货币单位。金额字段均为原单位，不把显示的£金额直接填写为原单位；所选原游戏100单位=£1。

```json
{
  "name": "buy-one-head-item", "mode": "gameplay",
  "goal": {
    "kind": "purchase-one", "slot": "head", "variable": "hairpin",
    "colour": "black", "accessoryColour": "black", "modder": null,
    "baselineMoney": 10000, "baselineCount": 0, "unitCost": 500, "maxSpend": 500
  },
  "budget": { "timeoutMs": 600000, "maxActions": 4, "maxObservations": 16 }
}
```

金额、库存基线及报价必须来自当前选定原状态；示例数值不构成现场事实。使用 `{"type":"dol-shop","operation":"quantity-one"}` / intent menu 经原range setter与input/change事件设置一件，重新读取原数量后，使用 `{"type":"dol-shop","operation":"buy-one"}` / intent buy。购买Goal的buy不接受裸web-click，避免绕过该Goal的消费前置检查；执行器本身仍不是技术权限沙箱。绑定原价格函数、描述对象、临时描述、穿戴和目标库存对象，同步检查原价格、资金/数量/颜色/目的地/容量/基线再派发原购买控件；不写钱或调用自制购买逻辑。

后置事实要求该精确变体库存增加一件、原余额减少且实际消费不超过maxSpend。`unitCost`是原商店报价，不保证其它Mod最终扣款一定等于报价。映射另外记录原money handler/函数摘要并绑定当前函数对象；身份摘要不等于该Mod已审阅，派发前仍需确认当前扣款路径及可能消费符合预算。工具不能物理限额未知Mod的handler，不能仅凭报价为未知扣款路径担保。实际扣款不同会明确保留 `priceMatches:false`，进入needs-result-interpretation；需要Agent核对实际原扣款路径并记录occurred与证据，不能自动接受差价、降低预算或重复购买。无效或无法解释的原结果不宣称完成。解释引用由Agent审阅，日志不独立验证其内容；没有新增Cheat Extended依赖或倍率计算器。跨物品/重复购买应另有明确目标与预算，不重置旧Goal掩盖已派发结果。

购买完成后，返回衣柜与穿戴使用后续Goal，引用购买回执串联完整短任务。穿戴恢复不会退钱或删除新物品；本轮实际购买仅一件，支出保留在原进度。

## 预算、未知结果与恢复

Goal总期限与派发预算跨执行片段保持。观察预算计入每轮原状态观察以及派发前预留的结果观察；失败/未知尝试也占预算。动作派发前持久记录pending；本地日志不会取消远端JS，也不保证exactly-once。

`needs-result-interpretation`时禁止盲目重放或直接追加动作。先读取新鲜原状态：普通目标已满足可结束；购买扣款与报价不一致时即使预算内到货仍需解释。理解上一步是否发生，引用实际本地证据，再显式记录Agent解释：

```powershell
node scripts/dol-dev.cjs game-goal-step --goal GOAL_DIR --reconcile occurred --evidence REVIEWED_LOCAL_RECORD --test-environment yes
```

也可选择 `not-occurred`；该参数是Agent解释，工具仅保存证据摘要和新观察引用，不声称独立验证了该证据。不能以“没有视觉变化”认定没有购买；仍无法安全解释时保持暂停，使用当前缺口所需的诊断。

已知删除/覆盖存档入口默认拒绝，列表读取和已允许测试档加载可以使用。任意Mod的JS不是权限沙箱：页面/控件语义仍需审阅，Evaluator和本地Integration具有实际执行能力。

`goal.lock`只阻止同一目录同时推进，不是跨Goal或跨Agent设备锁服务。崩溃可能留下lock/pending文件；不要自动删除并继续点击。先确认原进程已结束、读取独立新鲜现场并核对先前派发结果，保留事故记录，再审阅本地文件恢复。预算耗尽不自动重置计数或延长期限；新的任务尝试须保留旧结果。

`completed`表示本次目标谓词成立及必要解释已记录；清理质量、Evidence状态与整个3.0产品完成分别记录。其它设备/UI/复杂衣槽属于覆盖扩展；一次购买与返回穿戴已实现并通过所选真机，修改前后受控复验和最终封装继续单列，不能放进Coverage隐藏。
