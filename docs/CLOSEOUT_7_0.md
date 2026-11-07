# Gold Experience 7.0：范围与覆盖

2026-11-07。本轮完成 Windows 接续及本地候选收口，并按用户随后指示准备正式发布。当前名称为 **DoL Dev Tools — Gold Experience（黄金体验）**，版本7.0.0。Tusk ACT4 是研发阶段名，Paisley Park 是历史名称；内部包名、Skill 标识、Schema/receipt 身份、启动器别名和数据路径保持兼容。

本页区分能力完成、一次实验的结果和覆盖限制。用户在本地候选验货后明确授权正式发布7.0，包括主线整合、Tag和GitHub Release；不更改仓库地址或保护规则。正式包的固定源码、摘要与发布后核验另记，候选的原身份与结果保留。

## Delivered

- 独立 PC Chrome：显式可执行文件、专用 Profile、资源白名单、精确 target/document 绑定，接入共享 Action/Journey、GER、Evidence 和可选 Integration。
- 有界源码查询：工作树或固定 revision、组合线索、候选摘要、partial 原因；缺失对象不隐式触发 Git 抓取。
- TypeScript 维护与预生成 CommonJS 分发：95个运行时 Node CTS、3个开发工具、17个 DOM 文件，133个生成产物。46段已持久化摘要的页面函数保留原 ABI 文本，不冒充全量类型覆盖。
- Windows 路径、文件占用和生成回滚检查；启动清理保留主错误与清理错误；旧 Goal 的原 Store 缺失时拒绝空库替代。
- Android 继续复用官方 CLI、ADB、CDP；独立真实 App 原生保存和原回执恢复已验证。Kotlin 原型保留为实验，未采用为生产入口。
- 本地7.0名称、版本、README、Skill、安装说明和CLI一致性收口。安装成功、resolver 成功与宿主发现分别验证，不宣称当前聊天热重载。

## Validated

下列是按原时点复用的有效证据，不计为本轮重跑。实验源代码、完整环境、失败和原数量保存在[Windows统一记录](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/00c44a58e70178e1016776785e2a548e14e55e5f/experiments/tusk-act4-7/WINDOWS_CLOSEOUT_20261107.md)及其链接；该固定提交先于本地7.0元数据改号。

| 范围 | 已有证据与边界 |
| --- | --- |
| Windows 离线 | cd28b0a源码与独立包各Node633项（631通过、2跳过），Python10项（9通过、可选Pillow1跳过）；后续按实际改动追加定向回归。最终候选新结果以其 `validation.json` 为准。 |
| Windows 编译与文件占用 | 98 strict Node、17 DOM、133生成产物；125类型负对照；真实Windows文件共享锁与回滚6项。 |
| Windows Chrome | 源码与独立包各PC12、GER13、Integration10；七组真实Chrome合同各45项。a9dc4bc固定包后补GER13，CLI子进程均禁用类型剥离；使用自建业务夹具，不是全游戏验证。 |
| Windows 真实 DoL | 0.5.12.13的原生保存、独立执行进程中断后的原回执恢复、导航及窄Scope拒绝。恢复只结清原attempt，没有重放。导航中的自动保存事务为0，未当作非零自动保存通过。 |
| 源码查找 | 精确上游0.5.12.13提交的衣柜、侧栏和其它逻辑候选，经独立原始搜索对照；源码/包各36通过、1平台跳过。大范围或缺对象查询仍可能partial。 |
| Android | 已授权原目标的只读/文档更换与旧绑定拒绝；独立App副本完成一次原生保存及中断恢复，后卸载。该副本未复制私人数据，不代表原目标旧未决恢复成功，也不是本次新ZIP的Android字节验收。 |
| Kotlin 取舍 | 自有无内容探针的计数、旋转、前后台、强停和读取拒绝；同机观察成本比较不足以证明DoL收益，因此未接入生产。 |

当前Windows使用Node26.13.0、Chrome156.0.8078.81、PowerShell7.6.9。最终包的新测试与清理结果只按实际输出填写，不把历史Mac/Linux CI结果计入Windows通过数。

## 本地候选本轮检查

改号后的Windows源码完整Node套件667项：665通过、2平台跳过（macOS权限行为、非普通查询输入）；Python10项：9通过、可选Pillow1跳过。名称/安装/CLI定向20项通过，生成一致性98 Node / 17 DOM / 133产物与125类型负对照通过，Skill结构校验通过。新显示名在修复前被resolver拒绝，加入精确兼容名称后通过；旧名称仍可用，非本项目包继续拒绝。独立包和宿主发现结果由候选随附验货文件补充。

## Not validated

- Windows最低Node26.0.0；现有Mac最低版本结果不代替本机测试。
- 全部游戏业务、Mod/Loader组合、设备、WebView Provider及浏览器矩阵。
- 完整无人接管的Android Mod调查—修改—部署—业务复验闭环。
- 最终候选ZIP在Android重新安装后的全套验收、当前聊天的自动Skill热重载。
- Kotlin对真实DoL的收益、生产设备代理或后台任务；本版没有这些能力承诺。

## Known limitations

历史原目标的默认Store缺失，备份落后于最后已知快照；旧原生资源元数据另有差异且未定因。四条历史pending仍保留。未把备份晋升为完整历史，未通过新库或独立App结清它们。这阻挡该目标的可信恢复，不阻挡已验证的独立能力；更完整的SQLite备份机制留待未来需求。

旧Store检查是恢复入口预检，不是与外部删除操作之间的原子文件锁，也不检测用户显式新建Store以前的所有遗失历史。保护同一目标的Unknown仍须使用原账本和原资源身份。

后台页面截图可能超时，根因未完全确定。采集失败不证明动作未发生；不能盲重放。强制终止宿主或断电也不保证全部资源立即清理，应核对本轮所有权和退出记录。

Provider仍按已审版本、原生函数合同和Outcome执行。源码命中、DOM状态、transport ACK、业务成功是不同事实。Integration为经审查的本地代码，独立Worker不是权限安全沙箱；Evaluator本身能够执行页面JavaScript。

## Coverage Ledger

| 状态 | 项目 | 何时升级为任务 |
| --- | --- | --- |
| Completed，覆盖有限 | 当前约定的PC/Android代表宿主与共享能力 | 新回归、当前发布要求或真实缺陷 |
| Target recovery blocked | 原目标缺失Store、落后备份与四条历史pending | 找到可信原记录/身份证据后单独恢复，不能猜测结清 |
| Not validated | Windows最低Node26、更多设备/版本/Mod及当前聊天热重载 | 用户明确要求、目标环境变化或实际风险证据 |
| Optional / Future coverage | 专属Integration、SQLite备份增强、其它宿主 | 明确需求后定义新的Done |
| Experiment retained | Kotlin自有设备探针 | 有具体场景证明收益才重新评估采用 |

这里的未覆盖项不自动进入剩余实现清单。是否完成按当前承诺、验收证据和真实阻断判断。
