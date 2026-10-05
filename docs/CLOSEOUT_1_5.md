# DoL Dev Tools: Paisley Park — 历史：DoL Dev Tools 1.5 正式收口

2026-10-06，按用户确认的完成标准：**核心能力与约定场景已经完成并验收，剩余项目属于后续覆盖扩展、专项 Integration 或条件性验证。**

工具的完成标准是能力闭环成立。1.5已经完成通用诊断、有限复现、证据比较、可选Integration、Skill路由及约定目标的构建/部署/复验闭环。具体运行结果见[最终验收](FINAL_ACCEPTANCE.md)和[验证记录](VALIDATION.md)，能力组状态见[覆盖表](CAPABILITY_COVERAGE.md)。

## 三类状态

| 状态 | 含义 | 报告方式 |
| --- | --- | --- |
| Completed / 已完成 | 本轮约定交付已实现、验收通过，风险可接受，无本轮阻塞缺陷 | 列出实际证据与范围，不扩写成所有环境通过 |
| Implemented, coverage limited / 已实现，覆盖有限 | 能力已存在并在代表性环境验证，尚未覆盖更多环境/组合 | 不阻止当前范围完成；外延环境另入Coverage Ledger |
| Not implemented / 未实现 | 本轮计划内要求尚未实现，或关键验收条件未通过 | 属于本轮真正未完成；单列实现/修复与缺失条件 |

按用户最新全局规则，Optional Integration/Future coverage是独立的覆盖标签，不是本轮Not implemented状态。按具体能力和声明范围登记；一个能力组可同时有已验证核心与后续覆盖项。证据的complete/partial/failed仍表示该次采集或实验结果，不等于产品状态。历史失败/partial保留原样，后续通过单独关联。若当前明确约定的闭环确实缺少必需能力或发生阻断性失败，仍应报告产品问题，不能将它改名为可选扩展。

## Coverage Ledger：后续覆盖与责任

| 项目 | 状态与责任 |
| --- | --- |
| 更多设备、Android、WebView Provider、手机/平板 | Additional coverage / 未验证：已有矩阵与采证能力，按具体项目选定实体用例 |
| 全部游戏业务、全部设置、存档迁移、云数据 | 项目验收职责 / 按需验证：Tools提供调查/复现/比较/验证路径，不替所有项目跑全量回归 |
| MapleBirch、ModHub专属Integration | Optional Integration：平级可选生态扩展；Generic Diagnostics已可用于这些项目，不依赖其专属桥 |
| 其它包装App的原生入口/生命周期 | Future coverage / 新目标适配：Lyra已验证，新目标先核对自己的接口、构建与部署条件 |
| 权限弹窗、复杂动画、滚动等更多真实场景 | Additional coverage / 未验证：已有调查路径；发现实际缺口再补专项能力 |
| 第三方Skill候选 | Future coverage / 按需调研：审查、验证和复用，不预先集齐所有可能的Skill |

只有用户明确要求、当前发布目标要求、具体风险证据或真实问题出现时，才把Ledger条目提升为新的当前任务，并重新明确Done与验收范围。

## 风险匹配的验证与完成报告

每次任务先从已有上下文明确交付、必需行为、验收环境、本轮风险和Done；有关键歧义才向用户确认。只修改文档/Skill时核对链接、位置与指令一致性，复用有效源码/设备证明。模块行为或打包入口改变时做目标测试与代表性集成，必要时真机smoke；存档/迁移、核心Runtime/生命周期、跨模块所有权、破坏性API或云写入按实际风险做专项回归、集成、真机与必要深证据。全量回归只在高风险、候选版或发布验收确有必要时使用。

升级smoke→integration→真机、gfxinfo→Perfetto或Evidence→Full前，必须说明当前证据缺少什么以及升级能消除哪项实际风险。无新改动、失败或证据失效时，复用已有结果，不因“还可以再测”扩大验收。

完成报告分开列Delivered、Validated、Not validated与Known limitations。只有本轮范围内仍需实现/修复的内容进入Remaining work；Not validated保留在Ledger，不能自动变成阻塞工作。

Inspector、Leak Probe等输出的精度、截断和未知字段仍如实记录。涉及完整heap保留链、renderer归属或更深原生问题时，复用Chrome DevTools、Android Profiler或目标Integration完成专项调查；无需复制专业工具才能成立能力闭环。

## 可复用工作流

| 阶段 | 路径与交付 |
| --- | --- |
| 核对现场 | Skill解析Tools位置，Doctor核对明确设备/App及现有依赖；复用Android CLI、Chrome Inspect/CDP和ADB，不自动选择目标或修环境 |
| 观察与复现 | 选择最小充分的[采证入口](DIAGNOSTICS.md)；需要动作时审阅[Action/Journey计划](ACTIONS.md)，核对测试环境与控件语义，再执行有限动作和checkpoint |
| 诊断与修改 | 区分Generic事实、Integration解释和用户复现描述；关联到实际源码，优先复用已验证Skill/工具，只有实际缺口才做薄适配 |
| 构建部署与复验 | 使用目标项目自身[Workshop流程](WORKSHOP.md)，记录revision/制品SHA/实际加载身份，对同一问题做最小复验；失败停止依赖动作并保留证据 |
| 保存与报告 | 核对manifest、来源、时间、SHA与清理，使用[Compare/Issue Report](EVIDENCE_TOOLS.md)；标明三类能力状态、当前证明和下一步所需条件，报告不自动上传 |

目标Runtime保持项目自己的模型；Generic不依赖Soft & Wet或其它Mod。凭据认证由本人完成，真实存档/云数据的删除覆盖仍需对应授权。后续通过真实项目、设备和问题扩大覆盖；已通过且仍有效的证据复用，不因增加文档或新增环境标签重跑全部业务。

本次收口只调整说明与Skill工作流，运行时代码、schema和版本号仍为1.5.0。原1.5.0 ZIP/tag保持冻结；随本次口径更新的交付使用独立的收口文档包，不回填旧包或改变旧验收结论。
