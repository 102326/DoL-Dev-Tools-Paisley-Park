# Windows Skill Intelligence 7.1

这是 Windows 独立建设的版本化评测，不使用或替代尚未取得的 Mac 案例。复用 `codex exec`、Node test 与现有 Tools，不增加 Runtime、Runner 服务或 Ledger。实验材料由 export-ignore 排除，模型调用不进入 CI。

后续五类隔离情境与正式 7.0 / 当前 7.1 固定正文对照见 [isolation-1.0 结果](isolation-1.0/RESULTS.md)和[冻结协议](isolation-1.0/PROTOCOL.md)。下文保留首轮 12 题与未采用长稿的实验身份，两轮结果不能互相替代。

## 当前评什么

`cases.json` 的 `windows-1.0` 包含 12 个受控“下一步判断”场景，六个维度各两题：工具路由、最小验证/复用、授权、证据、资源/停止、跨项目泛化。项目标签覆盖原版、第三方 Mod、Sticky Fingers 和原创作弊 Mod。事实来自用户反馈和既有工程合同的脱敏变体；题面不是恢复出的原始事故日志，也不是实际设备现场。

重点对照是有效授权/隔离事实未变与云数据边界变化、自有已批准的可重建产物与明确工具策略拒绝。前者不能因阶段切换重复审批，后者不能因空间目标或未知权限而越权执行。普通源码调查与独立 Debug 不继承未决业务动作的阻塞。

## 三种证据分开记录

1. `grade.cjs` 检查完整、唯一的案例 ID、字段类型和可接受标签；错误、缺项、重复和截断不认证为完成。标签匹配不证明解释正确。
2. 独立新调用的 Judge 只看匿名 X/Y 回答及题面，逐题判断解释是否由事实支持。Judge 是模型，不是人工复核。争议及评分修订单列，未复核不能自动宣布谁更好。
3. JSONL 观察调用是否完成、工具是否失败、是否写文件或明显读取 oracle。零工具调用只证明情境判断，不算真实工具/设备验证；即使模型说“已完成”，也不替代原始调用记录。该统计不提供访问安全沙箱或模型来源签名。

`response.schema.json`、`judge.schema.json` 约束两种返回形状。`grade.test.cjs` 用负例验证评分器与轨迹统计；测试通过不代表 Skill 已提升。

## 版本与原始结果

基线 Skill 来自 `8ac52e23a4a65f886a089fa412bd3ae1f88282b6`。`trial-skill.patch` 保存增加两段解释的试验稿；主 Skill 没有采用该长稿。原始 Skill、prompt、配置投影、调用 JSONL、输出及时间保存在本机 `artifacts/skill-intelligence-7.1/windows-1.0/`。公开结果只提取经过脱敏的必要字段。

初版标签集合保存在 `oracle.v1.json`：严格匹配为基线 9/12、长稿 8/12。这不是语义正确率；Judge 认为两组解释均受支持，例如停止沿用旧预览与继续局部复验可以同时成立。`oracle.json` 的 `windows-1.1` 评分补入四处合理等价标签，两个原回答统一重算，不重新调用模型。此修订是看过结果后的维护调整，不能拿修订后分数宣称 Skill 提升；具体待复核项在 [结果](RESULTS.md)及 [results.json](results.json)。

## 复用与重现

```powershell
node --test experiments/skill-intelligence-7.1/grade.test.cjs
node experiments/skill-intelligence-7.1/grade.cjs REVIEWED_RESPONSE.json
# 明确复算旧版字段匹配，不覆盖旧评分含义
node experiments/skill-intelligence-7.1/grade.cjs REVIEWED_RESPONSE.json windows-1.0
```

实际模型试验采用已安装 CLI 的 `--ephemeral --json --output-schema --output-last-message`，保留既有模型/推理配置与规则；不使用 ignore-rules、ignore-user-config 或绕过批准。官方入口见 [OpenAI 非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode)。情境判断使用 read-only；有界源码探针只允许自有夹具输出，不涉及游戏/设备。stdout/stderr、输入与输出保存为独立尝试，失败不覆盖、不无变化重试。

新一轮先冻结案例、评分版本、Skill/指令及输入摘要，再调用模型。模型和 Judge 的真实性以实际调用结果为准，预设 schema 或手写答案不能计为模型轮次。不存在一个预先完成的“更好答案”供模型读取；禁止在模型 prompt 中给 oracle。任何公开交接先审查私人路径、凭据、存档与原始上下文，不上传完整会话或机器配置。

本轮结果仅说明固定题面和环境。新增实际任务摩擦时才补有区分力的案例，不靠扩大题量、更多警告或反复跑分宣布改进。
