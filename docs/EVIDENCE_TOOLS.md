# 离线比较、参考基线与报告

开发入口，无网络调用、自动上传或 Issue 发布。读取 manifest ≤1MiB、≤100 steps；制品必须为同一真实目录内普通文件、≤8MiB，单次验证总量 ≤32MiB、≤200 个引用。先校验 SHA 与 JSON incidentId；异常、缺失或不完整来源形成 partial，不导出原始异常。重型文件超限时只能标为未验证，不能报告完整比较。

```powershell
node scripts/dol-dev.cjs evidence-compare --before artifacts/before --after artifacts/after --out artifacts/compare
node scripts/dol-dev.cjs issue-report --from artifacts/after --out artifacts/issue
node scripts/dol-dev.cjs known-good --from artifacts/after --out artifacts/reference --label checked-control --snapshots dom-contract,css-contract,environment
node scripts/dol-dev.cjs evidence-compare --before artifacts/reference --after artifacts/later --out artifacts/reference-diff
```

Compare 输出步骤状态、制品 SHA 变化，以及有效完整 DOM/CSS/Environment/Storage 的描述性变化；不完整来源为 unknown。Android 性能只比较已知非负数值。时间/incidentId变化也改变 JSON 文件 SHA，不能把文件变化当作业务变化。Journey 只比较步骤结构和制品哈希；Integration 只比较状态，不解释私有正文。conditionsVerified=false、automaticTestVerdict=not-inferred，不自动判断兼容回归、性能提升或根因。

Issue Report 保存 report.json 和 Markdown，包含 incident/time、有限版本、步骤状态和固定失败类别。默认不带截图、输入、Console/Network/Storage 正文、Integration 诊断或复现自由文本。复现说明只记录采集状态；需要正文或图片时由调用者审阅后手动补充。生成报告不表示已提交 Issue。

Known Good 是调用者选定的本地参考候选，不是工具证明的业务正确性。输入必须完整，所选 DOM/CSS 不截断、Environment 不 incomplete、Storage 不遗漏或 unsupported。`--snapshots` 明确选择最多四类；缺失/不完整的所选类型在创建输出前拒绝，未选择的类别不混入基线。可选 Integration 的 failed/skipped 不阻断通用参考。

基线重新分配 incidentId，保存 originIncidentId、来源采集时间和新 SHA；仅投影所选快照，ID/class/data、style字符串和部分环境身份字段做哈希，不保留任意扩展正文。Compare 对普通输入应用同一投影；须用该命令的 reference-aware 路径比较。哈希可关联，不代表匿名化。新目录独占创建，失败保留制品和 partial manifest；不覆盖旧基线、不自动替换、不重复哈希已有参考。
