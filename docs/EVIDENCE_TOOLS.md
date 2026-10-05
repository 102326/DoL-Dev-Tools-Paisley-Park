# 离线比较、参考基线与报告

开发入口，无网络调用、自动上传或 Issue 发布。读取 manifest ≤1MiB、≤100 steps；制品必须为同一真实目录内普通文件、≤8MiB，单次验证总量 ≤32MiB、≤200 个引用。先校验 SHA 与 JSON incidentId；异常、缺失或不完整来源形成 partial，不导出原始异常。重型文件超限时只能标为未验证，不能报告完整比较。

```powershell
node scripts/dol-dev.cjs evidence-compare --before artifacts/before --after artifacts/after --out artifacts/compare
node scripts/dol-dev.cjs issue-report --from artifacts/after --out artifacts/issue
node scripts/dol-dev.cjs issue-report --from artifacts/support-001 --out artifacts/support-issue
node scripts/dol-dev.cjs known-good --from artifacts/after --out artifacts/reference --label checked-control --snapshots dom-contract,css-contract,environment
node scripts/dol-dev.cjs evidence-compare --before artifacts/reference --after artifacts/later --out artifacts/reference-diff
```

比较目录中的结构化结果是`compare.json`；Issue Report目录保存`report.json`与`report.md`。

Compare 输出步骤状态、制品 SHA 变化，以及有效完整 DOM/CSS/Environment/Storage 的描述性变化；不完整来源为 unknown。Android 性能只比较已知非负数值。时间/incidentId变化也改变 JSON 文件 SHA，不能把文件变化当作业务变化。Journey 比较步骤结构和制品哈希；Integration 只比较状态，不解释私有正文。conditionsVerified=false、automaticTestVerdict=not-inferred，不自动判断兼容回归、性能提升或根因。

`app-lifecycle` 在普通Evidence中另有语义比较，复用[生命周期Diff](APP_LIFECYCLE.md)：输出目标可比性、PID是否变化、新增报告的退出摘要和不再报告的数量，不复制PID/UID、本地时间、原进程名或任意扩展。不同目标/boot、缺失、无效或不完整输入形成unknown/partial。Journey的同序号checkpoint也只对双方显式声明的生命周期类型比较，按固定文件名配对，capture顺序变化不会误配。序号和完整状态不证明两次业务条件相同。生命周期不加入Known Good。

Issue Report 保存 report.json 和 Markdown，包含 incident/time、有限版本、步骤状态和固定失败类别。默认不带截图、输入、Console/Network/Storage 正文、Integration 诊断或复现自由文本。复现说明只记录采集状态；需要正文或图片时由调用者审阅后手动补充。生成报告不表示已提交 Issue。

输入目录有manifest时只读取Evidence；损坏或悬空manifest不回退到Support。无manifest时读取同一真实目录内≤1MiB的support.json，验证schema/身份/状态/有限步骤，固定投影版本和采集状态；不读取旁边的repro或图片。Support报告带supportId、projectedAt和originalEvidenceVerified=false；原采集起止时间为null/unknown，不能拿投影时间补造。新Support保留步骤required三态，必需步骤失败形成partial；旧Support缺此字段时，device/app/app-lifecycle的失败也保守处理，可选DOM跳过和Integration失败不降低Generic完整性。完整Support报告只证明其固定元信息可投影，不证明原始证据真实、完整或业务通过。

Known Good 是调用者选定的本地参考候选，不是工具证明的业务正确性。输入必须完整，所选 DOM/CSS 不截断、Environment 不 incomplete、Storage 不遗漏或 unsupported。`--snapshots` 明确选择最多四类；缺失/不完整的所选类型在创建输出前拒绝，未选择的类别不混入基线。可选 Integration 的 failed/skipped 不阻断通用参考。

基线重新分配 incidentId，保存 originIncidentId、来源采集时间和新 SHA；仅投影所选快照，ID/class/data、style字符串和部分环境身份字段做哈希，不保留任意扩展正文。Compare 对普通输入应用同一投影；须用该命令的 reference-aware 路径比较。哈希可关联，不代表匿名化。新目录独占创建，失败保留制品和 partial manifest；不覆盖旧基线、不自动替换、不重复哈希已有参考。
## 时间对齐

`evidence-timeline --from EVIDENCE_OR_JOURNEY_DIR --out NEW_DIR`离线校验现有manifest/制品SHA与incident，投影采集/动作区间、短时Event/Mutation/Error/Observer/Long Task、Console/Network时间和性能采样时刻。最多1000项；不输出正文、selector、私有URL、原始错误或任意业务字段。

hostOrigin使用主机captureStart。Target事件只能在自身时间锚点与Android clockOffsetMs可用时估计映射，保留clockUncertaintyMs；缺锚点进入unmapped、状态partial，不用结束时capturedAt倒推出虚假的精确事件时间。旧Timeline未记录targetStartUnixMs的窗口不能补造锚点；新窗口记录performance.timeOrigin+performance.now，仍是目标时钟估计。原生gfxinfo帧纳秒与系统trace未重建到此轴，累计帧/jank只是采样观察，不当作瞬时事件。

时间顺序与接近不证明因果，秒级Android时钟估计也不能支持毫秒级跨来源断言。不同设备时钟或长期会话的时钟变化须另外核对；这不是Chrome/Perfetto完整Trace Viewer。

源端dropped/truncated/omitted与投影遗漏分别保留；已知时间源的envelope/data不可用或格式无法投影进入unmapped/partial。Long Task使用有效startMs作为区间起点，atMs只记录callback观察时间；起点未知时只保留reportedDuration，不构造错误区间。关联进程内存只投影采样观察时刻，不伪造逐时变化曲线。
