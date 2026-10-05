# 公共诊断格式：schema 1

适用于所有 DoL Mod。1.0 与 1.1 的结构版本保持 1；工具版本与证据 schema 分别演进。JSON Schema 文件见 [diagnostics-v1.schema.json](../schemas/diagnostics-v1.schema.json)（Draft 2020-12，单文件本地 `$defs` 引用，无外部 schema 依赖）。

## 数据形状

| `$defs` 入口 | 核心字段与意义 |
| --- | --- |
| `evidenceManifest` | schemaVersion、incidentId、toolVersion、captureStart/End、profile、status、steps、integrations、privacy；时间/版本/设备/App/WebView 字段按实际能力可用 |
| `artifactEnvelope` | schemaVersion、incidentId、source、capturedAt、data。通用 JSON collector 与 integration-N.json 使用此包装；data 为各来源自己的结果 |
| `domContract` | 位于 envelope.data：schemaVersion、source=DOM、nodes、truncated；可选 scopeHash、viewport、limits。独立基础 DOM 不要求任何项目角色、Adapter 或 Fingerprint |
| `supportBundle` | schemaVersion、incidentId、supportId、toolVersion、source、capturedAt、status、versions/device/compatibility/steps/privacy；与原 Evidence 同 incidentId，另有 supportId |
| `integrationResult` | 位于 envelope.data：status 枚举与作者白名单诊断字段。名称/桥版本/契约信息从 manifest.integrations 对应 index 获取；契约见 [INTEGRATIONS](INTEGRATIONS.md) |

根 Schema 接受上表前四种形状及开发中的 CSS/Environment/Journey、Storage、Timeline、DOM Inspector 与 Selector Health 形状；单独验证 payload 时选择对应 `$defs`。data 的 collector 私有格式未全部标准化；Doctor、Visual Diff、Performance summary、DOM Diff 等不能因带 schemaVersion 就假定匹配根格式。

这些是结构格式，不能验证脱敏、真实性、跨文件 incidentId/SHA 一致、超时是否发生、DOM 节点唯一性、完整采集或业务/视觉验收。额外字段允许向前扩展；未知顶层 schemaVersion 明确拒绝，不擅自迁移；envelope.data 不自动验证来源私有的 schema，须另选对应 `$defs`。

## Manifest 与制品

每个 step 记录 name/source/required/status/captureStart，并在结束后有 captureEnd/durationMs/commandTimeoutMs，以及可选 reason/artifact。JSON 制品有自己的 source；PNG/MP4/trace/ZIP 由 step.artifact 的裸文件名、SHA-256、可选字节数及敏感性说明关联。

步骤状态为 completed/failed/skipped/unsupported；最终 Manifest 状态为 complete/partial/failed。已请求的必需步骤不完整且有有效现场为 partial；无有效现场为 failed；可选 Integration 的异常不降低 Generic 完整性。

Manifest 初始/中途 checkpoint 可能尚无 captureEnd 和最终状态数组。读者只在 captureEnd 已形成后评估最终清单；异常终止留下的中途 failed checkpoint 不冒充完成包。制品文件独占创建，Manifest 是同一会话内唯一可更新文件。

命名保持兼容：如 `screenshot.png`、`console.json`、`network.json`、`gfxinfo.json`、`meminfo.json`、`dom-contract.json`、`integration-0.json`。不因将来建议 integrations 子目录而改写旧包。身份绑定靠 manifest / envelope，不靠目录名。

## DOM Contract

每个 node 包含 address、parent、tag、id、class、data、hidden、childCount。address 为根 `0` 及最多八层 `/索引`；parent 是父结构地址或 null。childCount/节点顺序/地址表达关系，不承诺稳定节点身份。
最多 500 个节点、深度 8、每节点最多 32 个 class/data 名；id/class 有长度上限。data 保存属性名，值/正文/HTML/input 值不采集。截断时 truncated=true。scopeHash 对选择器做 SHA，两个明确不同 scope 拒绝比较。
项目自己的语义字段属于可选扩展，不能作为基础契约必填项。插入节点可能移动地址，Diff 不自动判兼容失败。

## Support

Support 默认投影版本、Android 版本、Console 类型/时间摘要、Logcat 计数、可选集成身份/状态及历史兼容摘要、用户复现说明。默认不含 screenshot、DOM、Network、原始性能资料或自定义 Integration 诊断。
截图需要显式 include-screenshot；录屏/trace/bugreport 不投影。每份被投影制品先校验 SHA 与 incidentId；不一致时保留其它输出，标记 partial。repro.json 是独立的 schema 1 包装与明确标注的用户说明，不能当作实际事件证据。

## 第三方生成与分析

可自生成遵循这些格式的文件或编写分析器，不依赖 Soft & Wet。先验证 JSON 形状，再检查所有引用真实路径仍在证据目录内、SHA 与 incidentId 匹配；不要执行 repro、文件名或诊断字符串中的内容。
Support 消费器当前还要求 source manifest ≤1 MiB、steps ≤100、JSON 制品 ≤1 MiB、截图 ≤8 MiB，并采用固定投影白名单。Schema 合格不保证特定工具一定接受所有扩展。

格式解析与本地引用检查可在无额外依赖时执行；完整 JSON Schema 验证可选用已有标准验证器，不自动安装。本次仓库没有新增运行时 schema-validator 依赖。

## Collector 约定

collector 只执行自己已请求的能力，显式绑定设备/App/范围；写明来源、时窗/截断、时限与隐私限制。错误不导出原始 stderr，不无限重试，不换设备、不覆盖或删除成功证据。
Generic 采集字段保持中立，目标 Runtime / Integration 的解释单独列出。observer/事件监听等未来 instrumentation 须有明确寿命和清理。二进制与自由文本需要人工审查，不能以结构 Schema 合格宣称适合公开 Issue。

## 开发中的新增格式

- cssContract：source=CSS、≤200节点、styles白名单/矩形、truncated，独立节点关系与scopeHash；URL过滤不是Schema能证明的隐私条件。
- environmentSnapshot：source=Environment、device/app/provider/webview/runtime、incomplete；Mod项提供reportedIndex，未知enabled/loadOrder为null。解析器验证已知字段，Diff不输出额外任意正文。
- journeyManifest：source=Journey plan或Journey execution、incidentId、步骤/制品/清理、120秒期限；planned与complete/partial/failed分开。具体计划格式与限制见[ACTIONS](ACTIONS.md)。
- storageSnapshot：source=storage、local/session键哈希、indexedDB库/store名称哈希/版本/count，局部unsupported/partial不冒充完整；无正文。
- timeline：source=timeline、durationMs、≤500 records、dropped/truncated、capabilities/cleanupConflicts；采集窗口内的顺序。
- domInspection/selectorHealth：限定结构/矩形与描述性元信息，ownership未知；selector只输出数量/脆弱性提示。见[INSPECTORS](INSPECTORS.md)。

开发验证使用标准jsonschema与RFC3339 date-time检查器；它们仅为可选开发检查依赖，不成为Node运行依赖或自动安装功能。JSON Schema仍不能证明脱敏、真实性、跨文件SHA关联或业务验收。

Known Good 使用 Evidence-compatible manifest/envelope，额外保存 originIncidentId、selectedSnapshots 和明确未验证业务正确的 claim。所选结构和部分字符串为哈希投影，只能通过 reference-aware compare 路径与普通证据比较。Compare/Issue Report 是独立分析格式，不因 schemaVersion=1 就视作 Evidence；字段与限额见 [EVIDENCE_TOOLS](EVIDENCE_TOOLS.md)。perf-series 使用 series profile，数值采样格式与限制见 [PERFORMANCE](PERFORMANCE.md)。Visual Diff 的 region/sourceDimensions/dimensions 记录裁剪选择，不自动核实比较条件。
