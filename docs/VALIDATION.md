# DoL Dev Tools: Paisley Park — 验证记录

## 3.0.2 文档与公开历史重置：2026-10-08

用户要求仅保留英文主题名、提供首次使用简介，并明确授权删除 3.0.0/3.0.1 对应 Git 提交历史。完整旧 refs/提交和发布元数据已先备份到本地；公开研发链压成当前 Requiem 实现提交、接在 v2.0.1 后，移除旧两个 Release/tag，当前 3.0.2 tag/包重新绑定。原代码、存档保护、Store/未决 effect 和 S1/S2 证据保留，历史文档标明已移除下载入口。

本轮只改 README、Skill 和文档；检查名称、链接、旧历史可达性、当前源码完整性、包 digest 和安装定位。复用 331 项 Node、4 项 Python 及真实 S1/S2，不为 Git parent/文档变化重复 Gameplay。GitHub 缓存的孤立对象是否被物理清除不作为承诺；公开 branches/tags 不再引用原研发链。

## 3.0.2 — Gold Experience Requiem：2026-10-08

本轮验收为 Provider/profile 维护检查、compatibility API 表述、缺依赖入口和正式命名；不重做 Gameplay 业务验收。检查确认现场/控件/源码绑定、原 Scene transfer、Action、回执读取及 Ledger 已共享；新增特殊业务仍需自己的事实/终止合同。当前路由显式本地接入，不是动态插件平台。详细复用点见 [GAMEPLAY](GAMEPLAY.md#providerprofile维护边界)。低层三个 Goal 名不改，明确 compatibility API 身份。

定位的发布体验问题：原 Runtime load 在一次只读 ADB 查询后发生，且 CLI 通用 catch 隐藏具体安装错误。现在先检查 Runtime 依赖，再查询 Android/创建目录、Store 或 Session；已知依赖错误输出固定安装指引，其它原始错误继续隐藏。缺 XState/SQLite 的独立子进程断言零 Android I/O、零输出/Store 写入；受影响 Goal 32项通过（含子测试），Generic 无依赖检查保留。命名统一为 3.0 阶段 Gold Experience Requiem，包版本3.0.2；旧发行文档不改写。

复用 3.0.1 S1/S2、共享执行/Outcome/Recovery 和实机安装观察；本轮未修改它们的逻辑或原游戏。最终 CI、包/Skill/安装及资产校验在本地发行回执保留，CI 用锁文件安装，更多环境仍记 Coverage。

## 3.0.1 候选收口：2026-10-08

当前 M5 S1/S2 代表性验收完成，范围见 [CLOSEOUT_3_0_1](CLOSEOUT_3_0_1.md)。下方按时间保留中间记录，“S1 待完成”等是历史快照。

S1 原生离线独立 App，同 Session `e636bcc2-b809-4eb5-8747-027fa6b86ff2` 完成条件黑色 head 购衣→返回→穿戴：38 动作、73 观察、spent500/reserved0/pendingfalse，原 money500→0，精确 black/black hairpin 购买一次并最终穿戴，原白色 hairpin 回库存，最终 Bedroom。普通关门、教学战斗选择/对话、狗与欺凌偏航由宿主根据新 Scene 处理，Working Memory 保留事件与返回子目标；购买后独立进程 resume 保留原 Goal、deadline、已发生 witness 和消费，不重复购买。未写存档或准备性改游戏状态。约42分57秒墙钟含研发间隔，不作为连续运行指标。

复用 S2 同 Session `2e546fad-421c-4306-a9f5-770dacc2c2c5` 的原生劳动/返回、约12分40秒有效连续运行和无旧聊天新宿主接管；未因文档/发行版本改动重复业务路径。复用两模式同核心、Memory/租约/预算/未知效果/开发 checkpoint 专项及 M4 真实事件证据。

本机 Node24 候选检查最初330项中329通过，1项安装测试失败：带锚点 Markdown 链接未转换为安装后的绝对链接。修复共享 installer 的可选 anchor 保留，加断言后该测试通过。shop/menu/clothing/capability 4文件20项、Skill quick_validate、diff 空白检查通过；其余原有效结果复用。CI 在最终源码运行 Node22 与 Python 检查，发行安装验证另行记录。失败日志保留为私有 artifacts，不用反复重跑掩盖。

旧离线 App 的商店退出 guard 错把原 prehistory task 清理的阶段当作已清理，造成 started/Engine busy；修为 passageinit 查 before、后续 phase 查 after，并在新 S1 App 原商店退出证明任务/registry 清理、五 phase、Addon 与 history terminal。旧 attempt `d63bddd7-3cff-49c1-8c25-4d74b62a2d91` 没有完整 terminal，仍 pending，未重放或重置。旧 UI attempt `2c59c79e-6e9b-4193-9bd0-f8d65391864c` 同样保留；旧 mapping/object 清理失败没有冒充成功。

收口时只读核对共享 Store：S1/S2 都为 completed，各自未结清 effect 数为0。S2 的当前 status.pending=true 来自同物理目标后来留下的旧商店退出 effect，不能冒充 S2 自身未结清或清除该阻挡；完成时 pending=false 的历史证明仍有效。

M6 候选提交 `9993ca663dc3227bfe2b735af31158ea02bab020` 的 CI `37662651689` 完成：Node22 全330项、Python3.10 四项通过。干净 `git archive` 包含240个受控文件，逐项核对名称集合，无 artifacts/Store/依赖目录/APK/存档/密钥。解压副本在无 Gameplay 依赖时 version/help/doctor 成功；安装锁定 XState 后共享 Runtime 的35项检查通过。由该副本运行既有 install-skill，独立 Skill 定位3.0.1、quick_validate 和带锚点链接转换通过。当前入口8份文档/Skill局部链接、版本/名称、S1/S2原Store只读核对通过。

最终收口仅追加本段发行验证说明，运行时代码复用上述候选结果；实际发行 commit/tag/digest、稳定目录安装与本机 Skill 更新按 Release 资产和本地回执核对。冻结 v3.0.0 tag/草稿/资产不改写，私有证明不上传。

## M5 S1准备：原生首次出门与受限恢复：2026-10-07

标准 Session `5a3f48d3-b5a3-4ce5-b93f-c2797268572b`完成 Bedroom→Orphanage，1动作/3观察、pending=false、spent0。随后新 Session `6fc7ff56-5633-4fba-8ea1-82e8a2bef4bb`通过实际原生出门控件到达 Domus Street（turns33→34、time10200→10260、money500不变），触发原生首次教学入口。首次接收端错误要求活动 `npc` 数组增长，实际 `generateNPC` 更新 `NPCList`，导致旧合同 `native-passage-8128aafb01db`未结清。该失败已保留；修正容器断言，未修改原游戏变量、RNG 或教学状态，也未重放导航。

旧 effect `28e28a5c-720c-413c-b3de-da249d43b33f`只通过受审本地只读 recovery 结清：绑定原 nonce/合同/requestDigest，要求冻结的五阶段、五个已完成 Addon phase、自有观察器恢复及原 historyCreated 记录、仍相邻的原生历史、原金额/时间和重新审阅的接收端/时间对象/源码。SugarCube 在渲染前创建历史 moment，存入的 incoming tutorial/NPCList 与渲染后的 active variables 分开检查；不能要求它们是相同的完成快照。不修改页面 started record，不生成原时间回调数等缺失见证。首次恢复读拒绝、租约失效及纠正依据均保留。

共享停止后 reconcile 收费1次，pending=false、spent0/reserved0；Session仍 exhausted/halted，原 deadline不变，原停止理由 `observation-budget-exhausted`保留，未改称 completed。私有只读及清理证据分别为 `native-first-street-recovery-3c5a187e-4341-4f15-a54f-5cf4cec33929.json`、`native-first-street-reconciled-7c77f42f-cf71-477b-a7e2-03f2a0c2a441.json`。street/recovery/profile 15项通过；复用未改 navigation/time 相关结果。当前停在可观察的原生教学入口，无购买；这属于导航/恢复组件证明，不代替 S1 条件购衣同 Goal 验收。S2、冻结安装和发布均不变。

## M5 S1准备：原生商店扣款绑定：2026-10-07

原生 DoL 的扣款函数由注册的 `money` macro 捕获，未暴露 `window.money`。商店映射现在复用既有 function-macro attester 绑定实际捕获函数，保留已有全局函数路线；绑定失败、对象组释放失败不会被吞掉。受影响 shop/clothing-provider/purchase/contract 四文件 27 项通过。真实原生目标的零动作调查及共享 attester 核对通过，Bedroom/turns32/time10140/money500 不变，自有对象与 transport 清理完成；早期全局函数读取失败保留。私有证据 `native-shop-business-8dbaa774-fee7-41c5-ac45-4dd79ddf278e.json` 与 `native-money-attest-4afb218f-716e-4ccf-9509-4aaf79498877.json` 不发布。

这只修正扣款入口的源码/对象绑定，尚未验证商店现场 prepare、购买终止或实际扣款；没有发生购买，不构成 S1 完成依据。接收端、原库存及 moneyStats 增量仍须独立证明。复用未改 S2、穿戴和返回证据，不重跑全量验证。

后续购买 operation 组件以原控件一次点击为入口，要求原 `updateMoment` 同步完成一次、库存仅追加指定完整 variant、原穿戴不变、精确扣款及 clothes moneyStats 增量、同 Passage/历史记录提交和自有观察器恢复，才生成已有 purchase receipt 格式；失败保留 started，重复 attempt 拒绝。尚未接入 Provider，不具备可派发的购买合同。shop/native-shop-operation/purchase/clothing-provider 四文件 22 项通过，覆盖部分业务成功、无扣款、错误金额/款式、重复库存、旧历史、源变化及外来观察器所有权等拒绝分支。另修复报价观察可能进入原 `clothesIndex` 修复分支的问题：读取前核对唯一 index/name/modder，回归确认不调用价格函数。真实零动作核对了 clothingShopv2、刷新和目录等已载入原 widget 身份，原状态不变；未执行购买或计为 S1 完成。

## M5 S1准备：原生穿戴与返回合同：2026-10-07

原生衣物Provider接入已审简单head回执，独立于Soft & Wet；Node24受影响7文件40项通过。复用真实原控件脱下白色发卡并穿回的两份producer回执，原moment各1次、库存0→1→0、turn/time/money不变，source/object/transport清理通过；新领域回执校验离线读取两份原结果通过，无重复穿脱。标准Session `9c79a601-48d6-4f6d-8e18-5baff1726f01`通过原生“关上衣柜”返回Bedroom，1动作/2观察、terminal结清、pending=false、spent0/reserved0，原turns32/time10140/money500。首次只读调查误用同页attester而拒绝，0动作，改用已有导航attester后preflight与真实执行通过。详情与范围见[审计记录](GOLD_EXPERIENCE_REAUDIT.md#m5-s1准备原生穿戴生产合同与返回片段)。这些是片段证明，不替代S1同Goal购买闭环；S1/M6未完成，S2与冻结安装/发布不变。

## M5 S2：原生劳动资源目标与新宿主接管：2026-10-07

无UI、离线Lyra 0.5.12.13的同Session `2e546fad-421c-4306-a9f5-770dacc2c2c5`完成原生劳动使physique达到5310以上并返回Bedroom：原体能5142.857142857143→5322.857142857143、timeStamp2700→10140、money500不变，9动作、23观察、9重规划、pending=false、spent0/reserved0。三个40分钟原生活动具有八/八/四回调见证；全部9个原terminal及mapping/object/transport清理逐项通过。无旧聊天新宿主读取原Goal/预算/Memory/Outcome和新Scene，继续同一目标；租约及手抄引用拒绝记录保留，无重放、预算重置或存档写入。受影响8个测试文件55项通过；复用未改共享核心与M4真实事件证据。

该Goal墙钟约18分49秒；保守剔除约6分09秒源码/只读准备及Primary输入诊断，剩余约12分40秒为实际目标观察/决策/派发与受控交接/恢复，没有sleep凑时长或拼接其它Session。这条普通原生活动路径通过S2代表性验收；没有宣称本Goal又遇到随机对话或其它分支全部通过。精确证据、失败及范围见[审计记录](GOLD_EXPERIENCE_REAUDIT.md#m5-s2原生劳动跨小时与新宿主恢复)。S1复杂副作用与M6仍待完成，冻结安装/发布和旧UI未知effect不变。

## M5准备：原生知识活动与新宿主恢复：2026-10-07

无UI、离线Lyra 0.5.12.13的同Session `9c6e940a-21ac-4b34-bacd-5deb10bad01b`完成原生发现daisy知识并返回Bedroom；8动作、18观察、8重规划，8个terminal结清，pending=false、spent0/reserved0。寻找活动有1800秒/四回调/空Hook表/同步见证；原知识及返回谓词同时为真。无旧聊天新宿主读取原Goal、预算、Outcome和新Scene后接管返回；两次ADB进程环境失败收费保留，修正明确原因后标准resume，无重放或预算重置。受影响园地4项、接收profile10项通过，复用未改相关证据。详见[审计记录](GOLD_EXPERIENCE_REAUDIT.md#m5准备原生知识活动与无旧聊天新宿主恢复)。本次含代码研发间隔，不能算作完整S2连续Gameplay；S1/S2强场景与M6仍待原约定验收。

## M5准备：原生日常活动短路径：2026-10-07

相关profile与状态检查11项通过，复用未变更的时间、共享Action/Outcome和恢复证据。无UI、离线Lyra 0.5.12.13的Session `ec7a5206-8311-4030-a2c3-519cb8c67425`实际完成Bedroom→大厅→Bathroom→刷牙随机场景→Bathroom→Bedroom：5动作、10观察、5个terminal结清，pending=false、spent0/reserved0；原时间180→660、金额500不变。刷牙动作有300秒/四回调/空Hook表/同步见证，随机生成孤儿来访正常处理并返回原Goal。原状态谓词与实际活动路径的证据分开，不把初始hygiene或时间条件单独当活动证明。详情见[审计记录](GOLD_EXPERIENCE_REAUDIT.md#m5准备原生日常活动真实短路径)。这仍是M5准备，不替代S2约10—20分钟连续Gameplay及无旧聊天新宿主接管；S1和正式封装仍待原约定验收。

## M4原生动态事件与共享guard传参：2026-10-07

Node24受影响的8个测试文件62 passed、0 failed；相关真机Session `9c48b1e7-3457-46f3-93aa-da9eca14a437`在无UI、离线Lyra 0.5.12.13完成Kitchen→大厅普通随机事件→同页继续→Bedroom，三个terminal均结清、pending=false、spent0/reserved0，原timeStamp最终180。事件/返回计划、租约到期后的同Session resume及早期只读失败保留，详见[当前审计记录](GOLD_EXPERIENCE_REAUDIT.md#m4原生普通事件动态返回与同session恢复)。这不替代M5 S1/S2或新宿主验收；冻结安装/发布未改。复用未受影响的既有证据，没有重跑全量回归。

## 正式3.0撤回与架构重新审计：2026-10-06

原v3.0.0已撤为草稿，稳定latest恢复2.0.1；tag、原资产/摘要、源码和现场证据保留。以下3.0候选记录仍证明Foundation原范围，不证明新定义的持续Gameplay核心。当前交付与后续必需研发见[重新审计](GOLD_EXPERIENCE_REAUDIT.md)和[撤回记录](WITHDRAWAL_3.0.0.md)。

本轮只修改状态说明、架构设计和Skill，验证文档链接/格式、安装器及源/安装Skill一致性，复用未改动的Foundation结果；不重新跑全量Node/Python或真机，不安装框架候选。框架稳定tag/官方文档审阅与独立设计复核不替代本地spike及新S1/S2验收。

文档本地目标检查298处通过；`node --test tests/install-skill.test.cjs`通过1项，源/安装Skill quick_validate与resolver检查通过，生成指引指向本机3.0 Foundation。当前指引与旧Skill完整备份保留；核对47个运行时/Schema/入口文件摘要未变，冻结ZIP和两个远端资产摘要未变、13条旧tag记录保留。格式与文档一致性通过，不将位置解析或设计复核写成新Gameplay运行证明。

## 3.0.0 Gold Experience候选与收口：2026-10-06

本轮范围以[3.0收口](CLOSEOUT_3_0.md)为准。最终源码 `node --test tests/*.test.cjs` 119 passed、0 failed、0 skipped，包括Goal跨片段/预算/未知结果、原状态谓词、映射漂移、可选缺失、守卫输入与现有Generic/Action/Journey回归。阶段性29/34项结果与真实失败收据保留；最终候选检查不抹掉先前失败。

Python3.14首次执行四项：两项Backup通过，Visual/Schema因缺少可选依赖跳过。使用已有捆绑Python3.12+Pillow执行Backup/Visual三项通过；用已有schema-validation-deps及匹配Python3.14执行Schema一项通过，最终四项各自实际通过，无需安装依赖。跳过记录保留，不将首次跳过计为通过。

真机证明复用本轮仍有效的stage1/2/3原记录：M367FC、Android user 0、Lyra包装App 0.5.12.13、UI 2.2.1/2.2.2，衣柜/普通绕路、单件购买、资金/精确变体/穿戴与恢复。价格差异调查、首次输入守卫不支持、原anchor不可操作等失败已解释并修复，没有未知结果重放或钱/库存回写；包装App不替代unknown GameVersion。

受控C采用实际隔离Git源码包 `c681890`→`45464d6`，相同原head穿戴与恢复Goal各执行一次；四个Goal完成、pending为空，三份选定原库存/穿戴摘要相同，资金、UI及Mod组合一致。五个当前加载UI/兼容包JS/CSS摘要与既有制品核对通过。这个证明属于Tools Node源码更新，不是新增APK部署或完全受控UI升级；原生/业务Mod部署能力复用[既有1.5验收](FINAL_ACCEPTANCE.md)。

发布一致性检查涵盖当前产品名、版本、CLI help、Skill入口与安装器、文档链接、Git原文字节/CRC/文件集合/私有资料排除、独立源码包启动和本机稳定安装。发布提交/包摘要、旧Skill备份、远端tag/资产/CI回执只保存本地交付收据；未把游戏证据上传。新包通过相同安装器生成完整Skill，不只改旧安装文本。

Not validated与Known limitations分别记录在[Coverage Ledger](CLOSEOUT_3_0.md)。有限映射之外的intent不代表完整业务验证器；私有Goal制品保留experimental标识，不是稳定公共诊断格式。未改动平台的已有有效证据复用，不为穷举设备或生态而追加验收。

## 2.0.1实战经验指引封装：2026-10-06

范围见[2.0.1发布说明](RELEASE_2.0.1.md)：只吸收通用决策经验并更新Skill、AGENTS、诊断文档和发布入口；运行时代码、Collector、Integration与Schema相对2.0.0没有变化。项目特例与原始资料留在本地，CLI帮助可发现性及其它覆盖只是候选，不在本轮实施。

`node --test tests/install-skill.test.cjs`通过1项，验证独立安装、工作区外解析、生成链接/显示元数据、拒绝覆盖与失效位置停止；源Skill UTF-8 quick_validate通过，CLI --version和--help显示2.0.1及统一产品名。既有反馈复核与指引检查结果复用，不重新执行项目业务或设备动作。

发布封装核对Git原文字节、CRC、文件集合、文档链接与私有资料排除；将新包安装到独立2.0.1目录，备份原Skill后生成新安装，核对文档、resolver及Windows入口。实际提交、SHA、安装结果、远端tag/资产/CI和发布状态保存在本地交付收据。仓库CI按既有配置运行，不能冒充新增真机证明；旧tag、Release与冻结ZIP保持原样。

Not validated：新指引的后续实战收益、更多实体环境及候选路径。Known limitations保持原采样/unknown边界；本轮不增加运行时或业务覆盖。源/安装Skill与当前发行包应一致，不把仅更新旧安装文字当成新版本安装。

## 2.0.0命名与发布一致性：2026-10-06

本轮范围见[重置版说明](RELEASE_2.0.0.md)：统一显示名、包/Skill标识、主启动器、当前文档和公开仓库/资产；保留历史tag及旧验收记录。历史条目与原始提案保留当时名称，见[HISTORY](HISTORY.md)。Schema稳定URN、环境变量和夹具内部标识保留语义。

源Skill quick_validate通过。`node --test tests/install-skill.test.cjs tests/evidence.test.cjs tests/evidence-tools.test.cjs tests/workshop-origin.test.cjs`的27项中26通过；安装测试发现新增RELEASE_2.0.0.md含点号，旧文档链接改写正则不支持，已在共用安装器修复。针对安装测试复验通过，复用其余26项结果；没有以重跑掩盖失败。检查涵盖新身份/显示名、工作区外解析、安装元数据、拒绝覆盖/旧包误绑定、CLI名称，以及Schema 1证据的离线消费和Generic/Optional分离。

最终交付还核对Git原文/CRC/链接/资料排除、历史ZIP/tag保留、独立包安装、仓库说明与现有CI；实际提交、SHA和发布回执另存本地。复用此前真机证明，不重新连接设备或扩大业务验收。提示收益和更多生态覆盖未验证，原unknown/采集限制继续保留。

## 1.5.2指引打包与安装：2026-10-06

[1.5.2](RELEASE_1.5.2.md)将此前两次Skill指引提交统一交付；只改包版本、README/发布/安装说明，CLI、Collector、Integration和Schema沿用1.5.1。复用此前有效行为/真机证明，不重跑全量Node/Python/设备。

现有`node --test tests/install-skill.test.cjs`通过1项，验证工作区外定位、拒绝覆盖和失效位置停止；源Skill UTF-8 quick_validate通过。交付检查采用Git原文打包、CRC/文件集合/逐文件字节/本地链接/私有资料排除、旧包SHA保留，以及新目录安装后的指引一致性、resolver和Windows启动器。实际提交、包SHA和切换/备份位置另存本地交付收据，原历史收据不改写。

此轮只证明打包和本机重装闭环；未新增实际业务场景或生态覆盖，指引收益仍待后续真实使用。已知unknown与采样限制见发布说明。

## 实战反馈的Skill路由收口：2026-10-06

用户授权落实两轮反馈后的轻量工作流改进。此前1.5.1已处理ADB/Integration入口、Console缓存、DOM截断与版本来源。本轮只修改Skill：模式表前增加首次点击失败的按需Inspector选择、受影响唯一scope与截断说明、直接探针的来源/阶段/动作结果记录，以及探索到可复用Journey的条件；保留原DOM优先、未知根因、已有浏览器配置和目标项目业务断言的边界。不新增执行器、固定流水线、自动重试、安装或重型采集。

复用已有UI与ReOverfits现场记录，不重新执行设备或业务动作。按当前CLI help、Inspector模式/唯一scope要求、Action/Journey不重试unknown结果和版本查询源码核对指引；源/安装Skill UTF-8 quick_validate、本地文档链接、生成指引一致性及resolver检查通过，定位仍为1.5.1。只同步全局Skill指引并保留旧文本；Tools运行时、版本、Schema和冻结ZIP不变，后续源码封装会包含新指引。

本轮交付Completed。未验证提示对未来执行者的实际改善幅度，也未新增设备/生态覆盖；这些不阻塞本轮文档与Skill任务。GameVersion unknown根因仍未知，未通过新措辞制造确定性。

## 1.5.1试用反馈修正：2026-10-06

本轮范围见[1.5.1说明](RELEASE_1.5.1.md)。只修改说明、CLI提示与可选采集元数据；原UI项目现场证据用于核对反馈，未修改目标项目、连接设备、重复采集或上传资料。旧1.5验收继续有效，不重跑全量Node/Python/真机。

`node --test tests/evidence.test.cjs tests/diagnostics.test.cjs tests/evidence-tools.test.cjs`：30项中29通过；新增CLI测试脚本的箭头函数对象返回缺少括号导致1项SyntaxError，已修正测试脚本，针对该项重跑通过，非产品错误。随后新增Support来源/投影省略计数与旧格式unknown断言，`node --test --test-name-pattern='Support projects' tests/diagnostics.test.cjs`通过1项；其余未受影响的结果复用。验证了缓存事件时间保留、200条上限/省略、正文省略、DOM节点/深度原因、complete与范围分离、未知核心版本与包装版本分列及Support兼容旧包。

源Skill的UTF-8 quick_validate通过。交付采用Git原文源码包，另外核对包内文件、链接、私有资料排除、安装定位及工作区外启动器。未新增真机或生态覆盖；缓存逐条分类与未知核心来源仍如实保留，见[已知限制](RELEASE_1.5.1.md)。

## 终审文档与本机试用：2026-10-06

本轮仅固化短项目AGENTS、README首次使用入口、Live Device Access定位与Integration/Evaluator安全措辞，并同步Skill。运行时、Collector、CLI、Schema与版本号不变；检查文档链接、AGENTS/Skill口径及格式，复用此前功能与真机证明，不重跑完整Node/Python/设备验收。

另按用户的本机安装试用请求，将已验收收口ZIP独立解压到本地工具目录，备份旧Skill后重新安装，resolver定位1.5.0、UTF-8 validator与Windows启动器通过。试用不修改正在开发的DoL UI工作区或手机安装：从UI 2.2开发中的源码固定副本构建Runtime，原声明版本仍为2.1.0，在新Edge profile和自有页面调用实际已安装Tools。

通用DOM/CSS Snapshot及Diff、缺失Integration、实际Worker中的Soft & Wet桥、Adapter fallback/版本降级、Inspector Surface、输入省略和原节点/原按钮保留均通过；Runtime销毁后DOM与基线无差异，自建浏览器/服务关闭及CDP端口拒绝连接确认。这是开发Runtime的桌面接入试用，不是UI 2.2整包或Android业务验收。初次私有runner漏传目录递归参数、随后将Doctor的partial误当成桌面试用必需失败，各次收据保留；修正试用设置后在新目录执行，没有重试已派发业务动作。

Doctor如实保留当前进程ADB不在PATH和自有非标准游戏标题的CDP检查不可用，未修复环境；显式target ID的桌面采集正常。需要Android诊断时按README将DOL_ADB指向现有ADB并重新核对用户选定设备，不把此桌面试用写成Android现场通过。

## 1.5正式收口口径：2026-10-06

按用户确认，核心能力与约定场景已经完成并验收；剩余属于覆盖扩展、专项Integration或条件性验证。统一使用[三类状态](CLOSEOUT_1_5.md)，不把部分环境验证或按需扩展描述为产品未完成。工具负责调查/复现/诊断/修改部署复验能力闭环，目标项目负责自己的完整业务/存档/云端回归。本次仅更新文档与Skill工作流，运行时/schema/版本不变；复用下方仍有效的源码与设备证明，原ZIP/tag冻结。

本轮文档验证：仓库Markdown本地链接闭合、源与实际安装Skill的quick_validate通过、安装定位解析为当前1.5.0，生成后的安装指令与源码一致，Git差异检查通过；全局AGENTS保留既有内容并加入Scoped Done与风险匹配验证规则。复用既有96项Node、4项Python及选定真机验收证据，不声称本轮重跑；独立收口包按新文档提交核对Git原文、链接和资料排除，旧包保持冻结。

## 当前完整能力验收：2026-10-06

当前状态以[最终验收](FINAL_ACCEPTANCE.md)为准。下方1.0..1.4为历史阶段记录，其中“尚未运行/未安装/未证明”只描述当时结果；旧ZIP/tag和失败收据不回填。

- 新源码`npm test`：96 passed、0 failed、0 skipped，覆盖CDP逐请求上限、Journey第三参数传递、重型helper stale路径、detached安全错误、WebView收据边界及锁屏安全分支。
- Python Backup/Visual三项由已有带Pillow运行时通过，Schema一项由匹配现有jsonschema/RFC3339环境通过。首次合跑格式项跳过，查明现有rpds二进制对应Python3.14、捆绑运行时为3.12；未重装依赖，改由匹配解释器执行格式测试并确认无skip。四项分别实际执行。
- 新公开证据26份Draft2020-12/RFC3339验证通过，18份制品SHA与incident关联通过；包括重型三profile、WebView四CSS、独立detached、完整Journey与Support。Support无trace/bugreport二进制。
- 实机3秒Perfetto/bugreport/Android CLI helper全部complete/exit0；复用官方Trace Processor和Python标准库分别验证实际trace schema/目标调度与ZIP CRC/main entry。Support无重型二进制。
- 独立WebView-only 51204 complete/exit0：同Activity/process实际对象替换、旧token拒绝、业务源SHA/设置行为、实际App重启后复验；原App及已有连接保留。
- Detached 64MiB单请求及实机15步Journey complete：基线/三次设置打开关闭/复采/Observer窗口；投影截断明确下界。最初不可见侧栏按钮预检失败保留，后续仅增加临时自有按钮调用已知公开方法，未修改UI项目源码或把该结果当作侧栏修复。
- lock确认屏幕关闭；secure/未知keyguard的unlock按设计停止，用户本人认证后新返回收据complete、页面就绪、临时节点清理/已有映射/原App前台均确认。初始partial保留，人工认证不冒充自动解锁。无凭据/真实存档/云端操作。
- 1.5全局Skill已保留旧备份后向空目标安装；UTF-8 quick_validate及resolver通过。独立前向请求实际路由installed dol-dev-tools→android-profiler→perfetto-sql，用已经缓存且SHA匹配pin的官方解析器查询既有trace，schema/query exit0、70,038调度记录、非零error stats为0；trace与manifest SHA/大小一致、查询后未改文件。未连接设备、重新录制、下载/安装工具或另写解析器，明确不推出游戏性能/泄漏结论。
- 独立只读覆盖审查核对原始蓝图、实际模块/CLI与当前文档，未发现具体未实施的约定产品路径；原生交互复用Android CLI、scrcpy人工启动、矩阵由调用者选定配置、凭据由本人认证均保持明确边界。没有把其它设备或所有存档/业务扩写成当前通过范围。搜索发现的可靠第三方Skill同样可进入候选，但须审源码/权限/数据处理并做小范围验证，不能凭排名直接安装。
- 基于`9b5239d`的独立源码候选包132文件逐字节匹配Git，178个本地Markdown链接包内闭合；不含证据/备份/机器位置/APK/DEX/密钥/存档/媒体。含空格路径独立解压后20项相关检查通过，工作区外调用Windows启动器返回1.5.0。
- 首次包校验误给不存在的commit，修正为实际HEAD后发现本机autocrlf使普通git archive转换CRLF；明确按命令级`core.autocrlf=false`导出后与Git字节完全一致，不改全局配置，不放松校验。失败候选保留为本地诊断；最终包仅补验收文档，再核对源码/链接与1.2/1.3/1.4冻结SHA，复用有效行为结果，不重新发布中间候选。


## 1.3 功能收口：2026-10-06

后续范围纠正：以下1.3及更早记录是通用产品阶段验收。已发行1.3包/tag保持原样，不回填后续结果；后续原生、真实游戏APK与业务Mod更新证明分别记录如下。

## 1.4 统一交付检查

- 最终范围对照原蓝图独立审查，没有需继续新增实现的产品功能阻断；目标原生/业务闭环证明见下节，条件环境与完整业务回归限制保留。
- 最终1.4源码 `npm test` 91 passed、0 failed、0 skipped；source Skill与全局安装 quick_validate/resolve通过。Windows默认GBK导致validator首次解码失败，显式`python -X utf8`后成功；未改全局编码设置。
- 旧Skill先移到独立本地备份，再安装1.4路由；定位到同一Tools目录。独立前向任务实际执行两次Evidence Compare和一次Issue Report，均complete/exit0；after与after-restart CSS无差异，同时明确仅CSS不足以证明重启或所有游戏/存档业务。
- 候选包基于`bd98784255115376974c3b38ae2f1440aa7940e3`，127个跟踪文件逐字节与Git一致，157个本地Markdown链接存在且包内闭合；不含artifacts/backups/node_modules/Git、位置记录、APK/DEX/密钥/存档/媒体。
- 含空格路径独立解压、工作区外`DoL-Dev.cmd --version`返回1.4.0；包内Integration/Skill/native contract/receipt七项检查通过。最终包只补这些检查记录，重新核对源码SHA与文档链接，复用有效行为结果。1.2/1.3 ZIP SHA仍与原冻结值一致，无上传。

## 后续源码：主游戏真实业务Mod更新

- [目标业务配方](BUSINESS_MOD_UPDATE.md)在本轮独立离线Lyra副本的主游戏中持久安装DoLGameUI 2.0.3、更新2.1.0、重启后复验；business-run-1 complete/exit0。三阶段IndexDB来源、制品JS/CSS SHA、Mod/运行时版本均一致，真实设置打开/guarded click关闭通过；新进程session确认，sentinel保留。
- 可选native Integration经真实Worker available。三份CSS Evidence共9份标准Draft2020-12/RFC3339验证通过，191/193/193节点无截断，incident/SHA匹配；真实evidence-compare与issue-report均complete。
- `npm test` 91 passed/0 failed/0 skipped；收据字段注入/穿越/对象在创建输出/ADB前拒绝。独立源码审查指出的输入、ensureWebview及truncated问题在业务动作前修复；没有重试已派发部署。
- 原APK/已有forward/reverse不变，自建forward移除，原前台恢复确认；测试副本Mod安装与sentinel保留。没有改UI业务源码、原App存储、真实存档/云端，没有采集截图、Console或游戏正文。范围限设置与持久发行更新，不扩大为完整游戏回归或存档迁移。

## 后续源码：原生重建与真实游戏APK更新

- [目标自有配方](NATIVE_RECREATE.md)添加只读可选native Integration和独立离线Lyra验收副本；Generic没有新增必需依赖。构建输入固定副本/SHA、stub不入DEX、34,468个原assets/DEX字节保持一致；最终APK证书、包名、版本、组件、debug/backup/permission核验通过。
- 一次实机native-run-2 complete/exit0：同PID/processSession内Activity与实际WebView的UUID及identityHash均变；51201→51202同包/同证书更新，安装SHA匹配、同UID、自有files sentinel SHA保留，更新后document/#passages/SugarCube均就绪。
- 原App安装SHA/version/UID与已有forward/reverse清单逐项不变；自建forward移除、原前台恢复并确认。测试副本/sentinel保留，没有uninstall/clear/真实存档/云端/截图/日志正文。
- `npm test` 90 passed/0 failed/0 skipped；后续投影严格类型修正又经定向native测试通过。独立审查核对源码和固定实机JSON，无剩余阻断；不能扩大为独立WebView-only重建或全部业务数据保留。
- 首次签名因同一密码文件被两次消费而失败，改为signer复用已验证store password；首次runner因设备metadata使用appId而在安装前失败，修正并交叉核对pm exact UID后在新目录执行。失败资料保留，未重试已派发动作；旧矩阵restart partial保持原样。

- 对照原始蓝图的独立只读审查确认两处产品内格式断点：整包生命周期仅比SHA，以及Support不能直接生成Issue Report；均已复用既有契约补齐。未将其它设备、重型采集或专有生命周期的条件验收扩大成必需框架。
- 生命周期整包比较含普通Evidence与声明的Journey checkpoint，后者按固定类型文件名配对；不同boot/身份、缺失、格式错误或incomplete传播unknown/partial。未加入Known Good，不保存PID/UID、本地退出时间或任意扩展正文。
- Support报告固定验证身份/状态/版本/步骤，只读support.json；不复制复现正文、媒体、Console/Network或私有字段。投影时间单独标记，原Evidence时间保持unknown、originalEvidenceVerified=false。新Support保留required三态；独立复核发现必需步骤失败被complete掩盖的反例，补齐降级与可选DOM/Integration边界后复审无剩余阻断。
- `npm test`：89 passed / 0 failed / 0 skipped。定向回归覆盖来源冲突、损坏manifest拒绝回退、未知required兼容、必需失败、任意对象注入与capture顺序不同；`node --check`及`git diff --check`通过。没有设备动作、自动重试或上传。
- 复用既有真实只读生命周期Evidence及Journey，两条整包自对比均complete / exit0，语义比较targetComparable=true、pidChanged=false、新报告为空；从真实Evidence新建Support后直接生成Issue Report complete，两条CLI也exit0。自对比不证明跨场景条件一致；实际新事件差异由受控回归验证。
- Draft2020-12/RFC3339检查器验证Schema及实际新Support，required对象反例按预期拒绝；实际两个Compare/Support Report的固定结果和时间限制另有断言通过，不冒充这些离线报告已受未定义的根Schema验证。源码版本升级为1.3.0，schema仍为1；复用有效的产品测试，版本入口与仓库Skill quick_validate另验通过。

### 1.3 统一交付检查

- 候选包117个源码文件逐项SHA与Git规范字节一致，ZIP可读，129个本地Markdown链接存在并限定包内；不含artifacts/backups/Git/node_modules、机器位置记录、游戏/APK、真实媒体或存档。复用1.2已验证的`core.autocrlf=false`归档进程参数，未改全局Git配置。
- 独立含空格路径解压，从工作区外运行`DoL-Dev.cmd --version`返回1.3.0，`--help`可用；解压包Integration/Skill行为5 passed / 0 failed / 0 skipped。解压包实际安装独立Skill，解析指向该解压根/version1.3.0，quick_validate通过；没有相邻UI源码或Node依赖。
- 本机正式Skill更新前先将旧副本移至独立备份目录，再用公开安装器生成新副本；位置解析与quick_validate通过。独立前向任务只使用新隔离Skill和一个既有真实Support包，解析/help/报告均exit0；报告complete，正确保留未知原采集时间与originalEvidenceVerified=false，未将完成采集解释成App/WebView重建。主线程核对输出和来源；未再连设备或上传。
- 原1.2 ZIP的SHA复核不变，旧包与本地证据保留。正式1.3包须从记录本验收的最终Git revision生成并再次逐文件核对，旁边保存SHA256；归档注释记录源commit。产品代码与已验候选一致，只补本节交付记录，不为文档变动重复设备动作或全仓测试。

通用产品开发与交付范围收口，外部/条件场景按能力覆盖独立判断。真实Evidence留在忽略目录，不打入源码包。历史1.2与更早证明保留，当前Android隔离持久Mod和生命周期证明分别见以下记录。

## Android 生命周期元信息：2026-10-06（1.2发布后开发）

- 新增`app-lifecycle`、`app-lifecycle-diff`、`evidence --lifecycle yes`与Journey原生checkpoint，复用已有ADB、精确ProcessRecord/packageList解析与公共Envelope/Manifest；无新依赖、截图、CDP、Mod内部对象或动作。字段与API依据见[APP_LIFECYCLE](APP_LIFECYCLE.md)。
- 独立审查发现全用户pidof误归属和inputIncidents对象正文透传；前后绑定当前user、package UID、主进程名、hosting UID及非isolated记录，任何失败清空mainPid；五种CLI Diff共享UUID-only来源ID投影。回归覆盖另一用户唯一同名进程、UID/boot/PID变化、未知reason、截断/重复/格式、正文/trace不保留及对象注入。复审未发现剩余阻断。
- Journey现在保留collector更短的ADB命令预算，并合并collector/整体取消信号；已取消命令不会继续后续步骤。最新`npm test` 86 passed / 0 failed / 0 skipped；`node --check`与`git diff --check`通过。没有通过重跑掩盖失败。
- 当前授权App的独立profile只读采集complete / exit0；系统报告当前用户12条保留退出记录，当前主PID归属前后确认。仅观察的单checkpoint Journey随后complete / exit0，离线两次观察Diff targetComparable=true、pidChanged=false、newlyReportedExits为空。未唤醒、重启、杀进程、安装、创建转发或采正文；此观察不能证明过去没有崩溃。
- 8份公共Manifest/Envelope与2份生命周期payload通过Draft2020-12/RFC3339标准验证，所有采集SHA关联一致。初次标准检查拒绝新profile，原因是Schema枚举漏加lifecycle；补充固定枚举及valid/unknown-profile回归后原采集记录通过，没有修改采集数据或放宽未知profile。现有Python格式测试1 passed。更新资料60个本地链接存在。
- 历史保留/延迟、设备本地时间无UTC偏移、主PID世代与Activity/WebView实例未知均明确登记；没有把旧restart partial改成通过。原1.2 ZIP/tag与真实业务Mod/APK保持原状态，源码增补仅本地保存，未上传。

## Android 隔离持久 Mod 与传输清理：2026-10-05（1.2发布后开发）

- `npm test`：81 passed / 0 failed / 0 skipped。共享Forward记录完整远端socket；Evidence、Journey和两类Android Workshop统一精确核对后清理并确认不存在。回归覆盖同PID无关socket替换拒绝、独立清理通道、删除未确认保留unknown及无归属不猜删。
- 独立只读审查发现初稿origin未预检、Reverse可rebind/未知ACK误认领、Forward匹配过宽及context/root导航竞态。改为完整游戏执行前的空白存储预检、父同源排除、`--no-rebind`与ACK归属、共享完整映射清理、`uniqueContextId`和表达式内URL守卫/父loader核对；复审未发现剩余阻断。ADB查询删除非原子和观测后并发写入的限制明确保留。
- 首次准备阶段原生崩溃，尚未创建frame或写入Mod，原失败保留；App随后恢复，夹具移除新增协议清单请求，未据此确定崩溃根因。旧context版曾通过但不作为上述守卫的验收。修复版首次在wake后的前台检查停止，所有资源not-created；读系统元信息确认wake与前台恢复异步，再补一次wake后的5秒就绪观察，不重复派发动作或部署。
- 最终修复版新目录实机complete / exit0。空白预检通过，4代frame（含预检）使用固定唯一context；前后ZIP/源SHA分别匹配已验收桌面制品，公开ModInfo来源IndexDB、版本1.0.0/1.0.1，新frame实际CSS20×20/48×48。4份公共Manifest/Envelope、2份CSS payload通过Draft2020-12/RFC3339验证，源与Evidence SHA关联一致。
- iframe确认不存在、Runtime disabled、Forward/Reverse removed、HTTP closed；采证前后既有两类映射逐项一致。origin内自有夹具数据保留，不访问或清理主游戏存储。随后补充HTTP请求含Cookie时拒绝提供页面的守卫；`node --test tests/workshop-origin.test.cjs` 1 passed，实际生产handler经本地HTTP确认空白页不带游戏、Cookie请求及其后续请求拒绝，生产预检表达式拒绝六种既有状态与能力缺失。没有重复设备动作，不把这一新增分支冒充已运行的真机版本。两个Android例子`node --check`与`git diff --check`通过。
- 本回合宿主技能目录已列出`dol-dev-tools`，安装副本实际读取过；此前安装/独立任务证明继续有效。新Android入口和共享清理修改仅在开发源码中，已有1.2.0 ZIP/tag未覆盖，未推送或上传。

此证明限已授权App中隔离origin的持久Mod。主游戏业务Mod/APK更新、App重启与原生WebView recreate仍需相应项目的公开接入与现场验收；frame document重建不替代这些结论。步骤和运行条件见[WORKSHOP](WORKSHOP.md)。

## 1.2.0 统一封装验收：2026-10-05

- 1.0/1.1基线保留，源码目录原地更新为1.2.0。只在全部已实现通用能力、自有开发闭环和Skill验收后统一封装；具体业务接入条件见[RELEASE_1.2](RELEASE_1.2.md)。未推送GitHub或上传任何现场资料。
- 候选ZIP可读，111个跟踪源码逐项字节SHA与Git内容一致，111个本地Markdown链接存在且限定包内；不含artifacts/backups/Git/node_modules、机器位置记录、游戏/APK、私有媒体或存档。初次git archive受本机autocrlf转换影响字节校验失败，确认仅CRLF差异后仅对归档进程设core.autocrlf=false；不改全局配置，失败候选保留。
- 独立含空格路径解压，不带相邻UI源码。从工作区外调用DoL-Dev.cmd --version返回1.2.0，--help可运行；解压包Integration/Skill行为5 passed / 0 failed / 0 skipped。复用有效的全仓80项、Python/视觉/Schema和实机证明，不为封装重新执行设备动作。
- 解压包实际安装到新的隔离Skill目录，解析器确认指向该解压根/version1.2.0；静态Journey示例计划complete/exit0，只使用占位设备，不连接设备。本机正式Skill也已更新，旧安装移到独立备份目录，未产生重复发现副本；解析与quick_validate通过，宿主新回合自动发现仍分开判断。
- 正式ZIP从记录本验收的最终Git revision生成并再次逐文件校验；验证过程只更新这份记录，未变更已测产品代码。ZIP内Git归档注释记录源commit，旁边SHA256文件供核对，旧包不覆盖。

## Skill 与持久 Mod 夹具验收：2026-10-05

- 最终集成`npm test`：80 passed / 0 failed / 0 skipped。新增Skill检查实际运行独立安装的解析器，覆盖含空格路径、失效位置/显式恢复、防覆盖与无效来源无输出；没有新增Node依赖。
- 本机独立Skill安装与quick_validate通过。独立任务从安装副本定位Tools，使用两次真实WebView自有夹具Evidence完成Compare及本地Issue Report，文件状态complete；Compare exit0，Report单独退出码未捕获。首次猜错结果文件名被纠正为compare.json，失败未隐藏。未重连设备或上传，宿主新回合自动发现未在旧回合冒充验证。
- 持久Mod夹具真实运行complete / exit0：自有源20→48、Python标准库ZIP内两文件一致、CDP部署输入SHA一致、独立profile存入、不同document loader重载、公开ModInfo来源IndexDB/版本/自有源SHA一致、实际CSS20×20→48×48。4份Manifest/Envelope通过Draft2020-12/RFC3339标准验证；不采游戏正文/截图/日志。
- 初始隔离规则未排除127.0.0.1，公共API预检失败；增加固定能力元信息后核对并修正。本地HTML内存副本将标准嵌入Mod数据块清空，排除第三方Mod；原HTML不变。后续重载旧context竞态导致source确认失败，明确ReferenceError后等待新loader再观察，最终新目录通过。中途夹具源码读取路径也从可能已释放ZIP改为公开ModInfo自有preload；不把尝试记录当作通过，不自动重试部署。
- 浏览器使用新profile与独立localhost，输出仅本地忽略目录；原手机、现有Mod列表、存档及业务源码未变更。持久Mod证明限桌面真实加载器的自有夹具，Android现有证明仍为临时自有节点；未验证Android持久Mod/APK更新或任何第三方Mod完整业务。

独立只读审查发现夹具在finally清理前报告complete。改为verification-complete中间态，独立有界等待自有进程exit、自建CDP端口ECONNREFUSED与HTTP关闭回调；不明则partial/exit1，不扩大杀进程范围。修复后新目录再次完成完整持久链，exit0，三项清理确认均记录；独立静态复核未发现新增阻断。另4份最新Manifest/Envelope标准Schema通过。原profile/尝试证据不删除。

## 后续完整能力增补：2026-10-05（未封装）

- 当前完整 `npm test`：79 passed / 0 failed / 0 skipped；覆盖Recorder隐私/候选、matrix全计划校验与失败停止、Network原session恢复、Animation界限/失败保留、Viewport授权/恢复/共享脱敏、Native Layout固定投影、Leak/Timeline清理与未知状态、Hitbox中心命中/SVG及关联进程身份/user/isolated UID。最后user/isolated支持的定向测试1 passed；没有隐藏设备partial或夹具错误。
- 受控已有浏览器：trusted Recorder 3条、输入未落盘、cleanup0；离线实验观察到5个请求失败，声明中性基线恢复后请求继续；phone/tablet/desktop三视口DOM/CSS/PNG完成且恢复观测匹配。独立detached数字可读，不能作为Android协议通过。2秒受控64×64视频抽取8帧complete，非游戏动画验收。
- 真机选定matrix：baseline与background-resume complete；restart动作后等待未完成，矩阵partial并停止；不将动作确认解释成后续业务页面通过。普通heap/DOM/listener采样available；detached与DOM清理确认不完整，Journey停止后续复采并保留partial。没有自动重试让失败变通过。
- `native-layout`未执行helper；现有CLI帮助与flat字段核对，离线runner/边界/脱敏测试通过。Viewport仅桌面受控现场；其它实体设备未模拟或安装。
- 时间对齐已验证源端遗漏传播、未知envelope/格式/锚点、时钟误差与Long Task实际起点；离线源SHA/incident先校验。统一轴不重建native逐帧语义。独立审查指出Viewport共享脱敏与Timeline丢源/错位问题，均修复并补回归；相应定向19 passed。
- [Workshop](WORKSHOP.md) 自有夹具实际完成源码→项目build/deploy→CDP重载→48×48复验，源码/dist/deployed SHA一致，前后Evidence/Diff/Report保留。首次最终断言误用comparison.name而非step，partial保留；修正夹具后新目录通过。Hitbox扩展后的夹具再次通过，前后私有截图人工查看与矩形一致，SVG现场输入导出通过。
- 真机 `process-memory` 读取主进程及一个准确关联的独立进程PSS/RSS。增加user过滤时首次漏支持ISOLATED双UID行而partial；核对实际公开行后修复，加入isolated/foreign-user回归，新目录complete。其它未精确匹配packageList的候选排除；不从名称/UID推断JS renderer。独立只读审查未发现阻断；未证明进程世代的限制保留。
- 已用标准Draft2020-12/RFC3339验证57份stage2 Manifest/Envelope与trusted Recorder payload；格式测试1 passed。Schema不证明SHA关联、隐私、原设置恢复或业务正确。没有新增Node运行依赖，版本仍1.1.0基线，未制作新ZIP/tag或推送。

Stage3标准验证进一步发现Workshop夹具漏写Evidence必需的privacy与step source/required/captureStart；宽松消费器能比较，但不能据此宣称公共Schema合格。修复夹具的实际采集元信息并新目录重跑闭环，38份stage3 Manifest/Envelope和最新user/isolated进程payload通过；6份旧夹具manifest按预期拒绝，旧资料不回填或冒充有效公共格式。最新Skill quick_validate valid，仍未全局安装；格式修复没有放宽Schema。

完整蓝图的实现/外部/条件路径与剩余验收见 [CAPABILITY_COVERAGE](CAPABILITY_COVERAGE.md)。真实目标项目制品部署与真机业务复验、最终Skill安装/独立任务与独立解压包检查仍未宣称完成。

后续在当前授权App执行固定自有WebView夹具：源码修改经其build/deploy形成SHA一致制品，实际矩形20×20→48×48。只采自有CSS scope；自有节点最终确认不存在，自建转发核对后移除，complete/exit0。未安装持久Mod/APK或操作业务存储。`node --check` 两个例子通过；4份真机夹具Manifest/Envelope标准验证通过，stage3/4累计42份及最新进程payload通过，6份旧夹具格式仍按预期拒绝。

## 完整能力开发工作区：2026-10-05（未重新封装）

在现有目录继续开发，package 仍为 1.1.0 基线；按用户要求暂不新建 ZIP、版本 tag 或推送。已明确当前连接 App 可用于普通测试动作，真实存档/云数据删除覆盖仍排除。

- CSS/Environment：限定 CSS styles/矩形、scopeHash、环境与公开 Mod metadata；真机 Evidence complete，CSS 154 节点、公开 runtime list 37 项。列表顺序是 reportedIndex，不证明实际执行顺序；未知 enabled/loadOrder 为 null。
- Action/Journey：完整计划先验证、静态 plan 零设备调用、当前用户安装与精确 foreground/focus、准备后再校验、派发后失败结果未知、总截止后不继续下一动作、独立恢复预算、未知动态 forward 端口不猜删。独立审查发现并修正准备后前台竞态与断链结果标记，已复核覆盖。
- 真机六步 Journey：等待页面、web-focus（activeElement 验证）、DOM/CSS/Environment/Console/Network checkpoint、旋转设置实验、短等待、截图。complete / exit 0；原旋转设置和既有 ADB forwarding 清单逐项一致，自己的传输清理完成。没有购买/输入/剧情推进/存档操作；此处未做真实 tap/input/restart，旋转设置成功不证明 App 实际转向。
- DOM Inspector/Storage：真机限定范围记录 154 节点，深度截断如实标记；所有权 unknown。local/session 数量 43/1，9 个数据库的只读结构/count 均 available；不读取键值或记录正文。Selector Health 对零/多匹配输出数量，不强行报唯一；半透明背景不报已知对比，色彩对比是 computed color-only 估计。
- Timeline：独立审查用 VM 复现 setup 异常泄漏、setter/冻结实例恢复失败、方法 getter 改变构造行为；外层 finally、独立资源清理、完整描述符复核与无 getter 探测修复，7 项模块回归及独立复核通过。真机 500ms 显式 instrumentation 窗口正常结束，3 类构造器可观察，cleanupConflicts=0；records=0，不能宣称捕获到了动作/Mutation 或 callback 执行。已有 Observer 与 callback 不跟踪，不主动 disconnect 项目实例。
- Storage 只读独立审查确认 upgrade race abort、截止关闭自有句柄/事务、迟到 count callback 不改返回结果；补充 hash 后 deadline 再核对及局部 incomplete 对比 unobserved，避免虚构删除。相关新增回归通过。
- Schema：隔离于忽略目录的可选开发 jsonschema 4.25.1 + rfc3339-validator 0.1.4 实际验证 Draft 2020-12 Schema、56 份当前真机 JSON 和 12 份对应 Collector payload；date-time/UUID/version 负例回归 1 passed。首次只有 jsonschema 时未启用 date-time format checker，负例失败；查明可选 RFC3339 检查器缺失后补到同一隔离目录，并断言检查器存在。未添加 Node 运行依赖、未改全局 Python 环境；CI 使用显式开发依赖。

上述模块测试、现场采集与普通复现实验分别记录，不代表最终能力、兼容矩阵或完整游戏验收已经完成。现场资料保存在忽略的 artifacts/complete-development-*，不打入源码交付包。

本轮后续验收：

- `npm test` 全仓 64 passed / 0 failed / 0 skipped。系统 Python（隔离 schema 开发依赖）4 项：3 passed / Visual 1 skipped；现有 Pillow Python 的区域比较 1 passed。统一 CLI 实际比较同一截图的 10×10 区域，complete；不证明跨版本视觉条件一致。Skill quick_validate valid，未全局安装。
- 增加 perf-series：先在休眠设备取得 3 组 native 内存/帧/thermal/battery，CDP unavailable，保留 partial。观察到 power Asleep、黑色截图和 NotificationShade 焦点；显式 wake Journey complete 后同一 PID/socket 恢复 HTTP。未重启 App。新的 3 组 native 与 WebView heap/DOM/listener/时间指标全部 complete；没有把首次失败删掉或隐藏，内存变化不作泄漏结论。Device 采集新增可用时的 wakefulness 元信息。
- Evidence Compare/Report/Known Good：离线 7 项行为检查覆盖 SHA、路径、缺失/未知、固定投影、Journey 任意字段/数组限额、防覆盖与选择参考。真实小范围 DOM/CSS/Environment Reference 建立后与原来源比较，三类 changes=0；参考新分配 incidentId，SHA 校验通过。首次默认包含 Storage 的基线因键名遗漏而拒绝；后来明确只选完整三类，没有虚构完整 Storage。失败的性能 Evidence 生成 Issue Report 为 partial，保留原始失败说明范围。
- 后续标准 Schema 验证累计 97 份真实 Manifest/Envelope 与 17 份对应 payload，包括新的 series profile 与 Known Good manifest；Schema 仍不证明跨文件真实性或业务正确。新增所选类型缺失回归首次命中通用错误文字；调整检查顺序以给出明确 missing 原因后定向与全仓检查通过，未放宽拒绝条件。

## 1.1.0 公共接入：2026-10-05

原目录继续更新，无新增 Node 运行依赖；证据 schema 仍为 1。1.0 源码包、tag 与替换前备份保留，未推送 GitHub 或上传真实资料。

- `npm test`：28 passed，0 failed，0 skipped；补充的 Integration 文件测试覆盖缺失/未知契约、错误钩子/结果、脱敏状态、输出限额、核心过滤、同步导入死循环、异步未完成及后台句柄清理、JSON-only 保存与 Generic 完整性。最后的 Support 名称/版本投影及嵌套元数据拒绝增补由同一测试文件复验，4 passed。
- 独立只读审查发现原地 redact 可改变 collect.status；保存脱敏前标量并在模块和核心过滤后对照，回归与独立静态复核通过。其他未发现阻断问题。审查中的 CDP budget/close 检查为 VM 模拟，不能当作真机传输验收。
- 异步 Promise 无 Node 活跃句柄时可能让 Worker 提前退出；测试明确接受 worker-exited 或 timeout 两种失败，不强求某种内部事件顺序，也不把退出视为成功。
- 真机：沿用已核对的显式设备/App，250ms CDP 事件窗口、`#passages` DOM，同时选择 Soft & Wet 与复制到仓库外临时目录的独立 DOM 示例。Evidence complete / exit 0；两个集成 available；示例只返回 childCount=1、hidden=false，Support complete，保持 incidentId。采集后原有两条 ADB 转发清单逐项一致，临时模块副本已删除。
- 本轮人工查看截图为清晰店铺页面。没有点按、购买、推进剧情、启动/重启或改存档；这里只验证现场采集，不代表游戏/视觉兼容矩阵。没有在真机卸载 Soft & Wet；真正缺失和未知 API 的边界由已有受控测试证明。
- Schema：JSON 解析、8 个本地 `$ref` 解析、真机 Manifest / Support / 14 份 JSON envelope、步骤/DOM/集成数据的必需字段检查通过。**尚未使用完整 Draft 2020-12 标准验证器验证 Schema 或实例**；检查结果不能写成完整 JSON Schema 验证通过。没有为验证安装新依赖。
- 仓库 Skill 的 quick_validate.py valid；更新公共接入与格式链接，不代表全局安装或宿主自动发现验收。
- 可携带源码候选包：53 个源码文件逐项 SHA、ZIP 可读性及 38 个本地 Markdown 链接通过；独立含空格路径解压，工作区外调用 `DoL-Dev.cmd --version` 返回 1.1.0，解压包 Integration 四组测试通过。不包含 artifacts、私有 backups、Git、游戏或 APK。最终包只更新这条验收记录并加入源码 commit 信息；制品逐项校验，复用已有效的产品测试。

现场只在忽略的 `artifacts/public-1.1-*` 本地保存。Worker 隔离的是故障/本地流程时限，不是文件/网络权限，也不回滚远端 JS 副作用。自定义普通字段的隐私仍由作者白名单与人工分享审查负责。

下面保留 1.0 和早期验证历史。

日期：2026-10-05（Asia/Shanghai）。本机原工具包已更新到 1.0.0；没有推送 GitHub 或上传真实证据。

## 1.0 收尾检查

- `--version` 返回 1.0.0；README / 命令说明 / 迁移说明一致。保留旧入口，JSON schema 仍为 1。
- 独立只读审查发现 Support 的版本字段可接受嵌套对象，导入格式异常但 SHA 正确的 Evidence 时会泄露无关数据。修正为 ≤64 字符字符串/null；新增回归覆盖五个字段，异常投影 partial 且敏感值被排除。审查者静态复核通过，实际测试由主线程执行。
- 1.0 真机 Doctor、未启用 Integration 的 Generic Evidence（限定 DOM + 短 Logcat + 示例复现说明）、Support 均 complete / exit 0。版本一致、incidentId 对应、全部制品 SHA 校验通过；默认 Support 无截图。复现说明是文档示例，不是自动识别出的真实故障。
- 本轮截图人工查看为全黑；系统报告 NotificationShade 获得焦点，目标 App 仍有可读主进程 / WebView。不能据此确定黑屏原因或声明目标页面视觉通过，没有点按或唤醒设备以制造通过结果。`complete` 只说明请求的制品采集完成；旧版本已验证的清晰截图/录屏记录仍列在下面。
- 采证前后已有转发清单一致，新增转发仅由当前会话清理。
- 源码包在独立临时目录（含空格路径、没有相邻 UI 源码）解压，43 个源码文件逐项 SHA、ZIP 可读性、文档本地链接校验通过。`DoL-Dev.cmd --version` 从工作区外调用通过；解压包 Node 24 项及已有含 Pillow Python 的 3 项测试全部通过，Visual Diff 统一入口也实际生成了受控图片差异。
- 解压包的 `evidence --full` / `perf --deep` 未给 `--sensitive yes` 时返回 1，且不创建输出目录；没有借交付测试采集重型系统资料。
- 已为替换前源码（含未提交 0.5.0）建立独立 ZIP 与 Git bundle 备份；原 artifacts / backups 没有清理或覆盖。

## 离线行为检查

| 检查 | 实际结果 | 证明范围 |
| --- | --- | --- |
| `npm test` | 24 passed，0 failed，0 skipped | CDP 传输、显式目标、输出保护、collector 失败保留、可选 Integration 隔离、脱敏、DOM 范围/Diff、性能解析、Doctor、Logcat、Recording、Support、重型包装及采集 profile |
| `python -X utf8 -m unittest discover -s tests -p "test_*.py"` | Backup 2 passed；Visual 1 skipped | 系统 Python 无 Pillow，明确跳过可选视觉能力；没有隐藏失败 |
| 已有含 Pillow 的 Python：`python -m unittest discover -s tests -p "test_visual.py"` | 1 passed | 实际图片像素变化、容差、尺寸拒绝、防覆盖与输出统计 |
| skill-creator `quick_validate.py`（`python -X utf8`） | valid | frontmatter、名称与结构校验，不代表 Skill 的现场行为已经验收 |
| `git diff --check` | passed | 已跟踪 diff 的格式；新模块由测试实际加载 |
| 新 CLI `--help` | passed | 入口可运行，不代表全部设备能力可用 |

Perfetto / bugreport 测试使用受控模拟 runner 和本地临时文件，不执行真实系统 trace 或 dumpstate。
无 Soft & Wet、API 未知、诊断缺失/异常由 VM 和采集器测试覆盖；没有卸载或修改真机 Soft & Wet 来制造这些条件。
原 evaluator、Android CLI 和 Backup 已有检查继续保留。没有新增 Node 运行依赖。

测试过程里发现两类问题并修正：

- 实际 Logcat 有缓冲区分隔行及 epoch 数据行前导空白，旧解析会失败；增加定向回归后重新采集一个新会话。
- Windows skill validator 默认以 GBK 读取 UTF-8 文档；使用 `python -X utf8` 验证。未更改系统编码或安装依赖。

夹具错误与产品错误分别处理：新增 Support 模拟制品必须有真正 SHA，模拟 MP4 须符合最小容器头；修正夹具后验证输出防护，不放松产品校验。

## 实际机器与 Android 验证

经用户授权使用空闲机器，核对当前可用工具与唯一连接设备。ADB 未在 PATH，但已存在独立 Platform Tools，调用时通过进程内 `DOL_ADB` 指定；完成后恢复环境变量，没有安装或修改全局 PATH。
当前 Android 前台是已经运行的 DoL UI 兼容 App；使用它的显式 package，不切换到另一个已安装的 DoL App。未启动/重启游戏、点按、换装、购买、推进剧情或访问存档。
实时截图、录屏和 JSON 仅保存在 Git 忽略的 `artifacts/validation-*`；本文不附 serial、私有路径、截图正文或原始日志。

| 实際操作 | 结果与限制 |
| --- | --- |
| Doctor（显式设备/App） | complete，exit 0；没有创建转发或修环境，可选 scrcpy 缺失被单独记录 |
| 初次常规 Evidence + 短录屏 + Logcat + Integration | partial，exit 1；仅 Logcat 格式失败，其他成功制品保留，原会话没有覆盖 |
| 修正格式后的新 Evidence + Logcat + Soft & Wet | complete，exit 0；Public API 被识别，适配当前状态未自动当作业务兼容通过 |
| 0.5.0 Generic Evidence + Logcat + 合成复现说明，未启用任何 Integration | complete，exit 0；manifest integrations 为 []，不读取 Soft & Wet 专属诊断 |
| 0.5.0 独立 perf profile | complete，exit 0；只有设备、App、gfxinfo、meminfo，没有顺带打开 CDP 或 Integration |
| Support 投影 | complete，exit 0；保持 incidentId，带入明确标注的合成复现说明；默认没有复制截图、DOM、Network、录屏或 trace |
| 两份真机 DOM contract 的 Diff | exit 0；结构地址比较可运行，未据此宣称完整兼容矩阵通过 |
| 两份实际截图 Visual Diff | complete，exit 0；尺寸相同，正常生成当前/参考/diff/统计；未将差异当作视觉失败或更新 Golden |
| Screenshot 人工查看 | 当前 DoL 店铺页面清晰可读，非锁屏；它包含真实屏幕资料，分享仍需检查 |
| 3 秒 screenrecord 的外部 ffprobe | H.264，3408 × 2272，约 3.013889 秒；没有操作 Drawer/Modal，因此没有验证这些动画或完整播放效果 |

未验证 Android CLI 新 layout 聚合。原入口可能安装独立辅助 APK，并包含原始布局正文，因此仍未纳入默认脱敏包。
真机采集后临时转发删除步骤完成，录屏自建临时文件清理状态为成功；不删除原有转发、系统 bugreport 或其他文件。

## 当前实机指标限制

当前 gfxinfo 提供汇总帧数与 jank，120 个时长记录的 Flags 均为非零（观察到 32）。本工具没有针对该标志推断时长语义，记录 excludedSamples，并将无有效样本的 median/p95 留为 null。
不把这些值解释成当前操作卡顿、整个游戏速度或 UI 优化收益；要分析该平台时长，后续应核对平台语义或按具体问题升级诊断。
meminfo 能解析 PSS/RSS，但没有按多次界面开关进行实验，也没有枚举 WebView 子进程，不能得出泄漏结论。
Console / Logcat 默认摘要不含原文；若摘要不能解释根因，报告该证据限制，不猜测原始异常内容。

## 未验收范围

- Perfetto helper 真机运行、trace 数据语义和 bugreport 完整性；本轮未下载 helper 或为了测试包装生成重型系统资料。
- 多设备、多 WebView/进程、其他 socket 命名、不同页面标题、其他 Android 与 WebView 版本。
- 原生 action/journey、游戏操作、存档恢复、性能改进、Drawer/Modal 动画和第三方 Mod 的完整业务矩阵。
- Skill 的自动发现与独立真实任务前向验证；它仅维护在仓库中，没有安装到全局。

收集完整性、离线测试、真机采证和业务/视觉验收分别报告；本版本的通过项不扩大到以上未验证范围。
