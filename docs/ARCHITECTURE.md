# DoL Dev Tools: Paisley Park：公共开发工具架构约束

2026-10-05。按最新公共开发定位与最终能力蓝图修订。完整需求、当前状态与后续批次见 [BLUEPRINT](BLUEPRINT.md)；当前可执行入口和验收以 DIAGNOSTICS / VALIDATION 为准。
目标是面向整个 DoL Mod 生态的公共本地开发、调试、诊断与复现实验工具链。Android CLI、Chrome Inspect / CDP、ADB 构成 Live Device Access，支撑 Observe → Understand → Act → Modify → Deploy → Verify → Preserve Evidence。
Android CLI看到真机画面；Chrome Inspect/CDP是Agent进入真实WebView内部的核心桥梁，提供限定范围DOM、CSS/Computed Style、Console/Exception、Network、Storage、Performance与页面状态观察，并连接可选项目Integration；ADB提供Android/App系统现场。Chrome DevTools也可用于交互式深入调查，CDP的定位不限于人工辅助入口。
本文是能力边界。1.0交付诊断和证据基础，1.2能力实现与条件验收见[覆盖](CAPABILITY_COVERAGE.md)；蓝图、命令存在和业务通过分别判断。

完成标准是能力闭环成立。1.5核心能力与约定场景已完成并验收；已实现但部分环境验证、可选Integration和后续按需覆盖不是当前产品未完成。Tools支持项目调查/验证问题，完整业务与存档回归由对应项目承担；状态定义见[正式收口](CLOSEOUT_1_5.md)。

## 三者职责

| 部分 | 职责 | 边界 |
| --- | --- | --- |
| DoL Dev Tools: Paisley Park | 进入 Android/WebView 现场，采证与比较；独立执行有限复现实验 | 面向所有 DoL Mod 作者，不依赖某个 Mod、Runtime 或源码目录 |
| 目标项目 / Runtime Integration | 提供自身版本、模块、能力与运行状态解释 | 自愿接入、平级可选；项目保有自己的业务模型与状态，Tools 不复制 Runtime |
| DoL Development Skill | 选择诊断与复现路径，解释证据，按任务完成修改/部署/复验 | 调用实际工具与目标项目既有命令，不复制实现，不虚构蓝图中的命令 |

Soft & Wet 是最早的重度使用案例之一和一个可选 Integration。其 UI Runtime 留在 DoL-Game-UI，只管 UI；不成为 Tools 的核心假设。MapleBirch、ModHub 和其它项目享有相同接入地位。

工具包继续独立维护。已有可用脚本保留，统一 CLI 逐步包装它们，不为统一入口重写全部脚本。
第一原则是不重复造轮子：优先组合已验证、可靠且边界清楚的Skill与工具。Android CLI承担原生屏幕/布局/交互，Android Profiler承担官方录制与trace/SQL分析，Chrome Inspect/DevTools承担深入WebView诊断，项目自身负责build/deploy。Tools只补DoL目标绑定、脱敏证据与实际缺失的有限能力；复用方法而不照搬项目假设，不另建UIAutomator、Trace Processor、Viewer或游戏Runtime。外部能力缺失时保留明确条件，不自动安装替代系统。
候选不限于上述官方Skill；搜索发现的第三方Skill也可参考。先审实际源码、来源与维护、复制许可、依赖/权限和数据处理，再做最小代表性验证。能直接复用就直接用，需要项目适配才做薄封装，也可只吸收诊断方法；搜索排名/流行度不代表可靠，不把发现动作当作安装或外部操作授权。
Skill随源码放在`.agents/skills/dol-dev-tools-paisley-park/`，1.2提供显式[独立安装](SKILL_INSTALL.md)，复用同一份Tools。

## 通用核心与可选 Integration

Generic Diagnostics 面向 Android、WebView、DOM/CSS、Console/Network、Storage、Performance、Visual、Environment 与 Evidence；具体当前已有入口见当前命令说明。Action / Journey 独立于 Inspect，供后续明确的测试复现实验使用。
即使完全没有安装 Soft & Wet，通用层仍可独立工作。某个设备或工具能力不可用时如实报告；“通用”不意味着所有采集必然成功。

`integrations/soft-and-wet/` 只放自己的诊断桥，不搬入 Runtime 实现。它按公开 API 的实际能力读取 Runtime/Adapter 摘要；Fingerprint、Selector fallback、Role Mapping、Adaptation Level、Degrade Reason、Surface 与 Compatibility Events 的完整导出按实际支持范围处理。
在建接口按实际版本、方法和能力检测；不能仅凭 UI 版本号假设所有增量接口存在或已经验收。不得访问内部 Vue store 或维护第二套诊断状态。

薄 Integration 契约只需表达：

- `detect`：目标是否存在。
- `describe`：集成名称、版本、能力和支持状态。
- `collect`：读取自己的诊断。
- `redact`：集成字段的脱敏规则或处理，仍须经过聚合层策略。

状态区分 `available / unavailable / unsupported / failed`。未知版本明确说明支持范围，不猜测内部接口。
缺失或异常的 Integration 不阻断 Generic Evidence。1.1 公开 [Contract 1](INTEGRATIONS.md) 和 [格式/Schema](FORMATS.md)，允许第三方自维护显式本地 `.cjs` 接入；内置与外置桥同样执行限时 Worker 和 JSON-only 保存。Worker 不是权限沙箱；仅运行已审阅模块。不建立插件市场、依赖解析或未知模块自动执行。

## Evidence、Manifest 与现场身份

每次采集使用唯一 session / incident ID，输出目录和 JSON 携带同一 ID。PNG、MP4、trace 等不能直接携带 JSON 字段的制品由 manifest 关联。
同一 ID 表示同一采集会话，不表示所有来源在同一瞬间采样。

`manifest.json` 至少记录：

- Evidence `schemaVersion`、工具版本、session / incident ID。
- 采集起止时间、当地带时区时间、设备时间；可测时记录偏差及测量不确定性。
- 设备、当前 package、App / Game / ModLoader 版本、viewport、WebView / Chromium 信息。
- 启用的可选集成、各步骤状态、耗时、证据文件、来源及失败或跳过原因。
- 完整性 `complete / partial / failed`，以及 completed / failed / skipped / unsupported collectors。

版本或环境信息不可读时标为 unknown / unavailable，不补猜测值。
`complete` 仅表示本次请求的必需步骤完成；可选集成缺失单独记 skipped，不导致整个包失败。请求范围内的必需采集失败且仍有可用证据为 partial；没有可用现场证据或无法形成包为 failed。
具体必需步骤由采集档位声明，不能以 `success=true` 隐藏缺项，也不能把未请求能力算作失败。

DOM contract、Integration 导出包装、performance summary、device report 等 JSON 从首版带 `schemaVersion`。第三方原始导出保留其版本含义，不擅自改写成工具版本。
旧 schema 的识别与不支持提示保持简单，不预建复杂迁移系统。

Generic Evidence 与 Optional Integrations 分开列出。Evidence 编排独立 collector，每个 collector 有明确输入、输出、来源和 timeout，可以单独失败。
不无限等待或重试、不自动换设备、不覆盖旧包、不删除已经成功的证据。单次失败记录原因后继续其他允许的步骤。

可包含 screenshot、annotated screenshot、layout、device、app、CDP、console、network、logcat、gfxinfo、meminfo、DOM contract、可选 Integration，以及命令状态和时间。
录屏、Perfetto、bugreport 等重型采集按需加入；`--full` 的计划须显示实际范围，不隐式授权设备操作或敏感采集。
支持 `repro.json` 或简单 `repro.txt`，记录 summary / expected / actual / steps / note，来源标为用户说明；不自动采集输入正文填充它。

## 数据来源与默认脱敏

每类报告标明 Android / ADB / Android CLI / CDP / DOM / Runtime / Adapter / User note 等来源。
DOM、CDP、Android 是对应来源的现场观察；Runtime / Adapter 是系统解释；用户说明是复现上下文。不能把 Adapter 判断直接写成 DOM 客观事实。

collector 尽量不采集敏感数据，Evidence 聚合层仍执行统一脱敏；不能只依赖各 collector 自觉处理。
默认排除凭据、token、cookie、Authorization、私有路径、本地文件名、用户输入正文、存档正文和角色数据。云 endpoint 与 URL 按敏感性处理。
错误消息、Console 和 Logcat 同样可能泄露内容；字段白名单、长度与数量限制优先于“收集全部后再用正则删”。
截图、录屏、trace、bugreport 不能通过 JSON 脱敏保证安全；须标明隐私限制，分享前检查，不能宣称默认包无条件适合公开 Issue。
原始未脱敏模式若以后确有需要须明确选择，不作为默认。数据留在本机，不自动上传。

Network 默认只留 method、经处理的 host / path、status、duration、resource type、error、timestamp。
去掉 URL 凭据、query / fragment 中的敏感数据以及 Authorization、Cookie、Token、请求 / 响应正文。深度网络调查独立选择，不做常驻 MITM 依赖。

Support Bundle 是普通用户反馈的轻量选择：版本、设备摘要、可选截图、精简日志、兼容状态、错误摘要和复现说明，采用更严格的脱敏。
Evidence Bundle 面向开发者调查，可包含 DOM、性能、Console、Logcat 和明确选取的 trace。两者共享现场身份和状态格式，不维护第二套采集系统。
Backup 继续独立处理真实私有应用数据，不默认进入 Evidence / Support Bundle，也不因本路线授权执行备份或恢复。

## DOM Contract 与视觉比较

Generic DOM contract 只记录明确范围内的关键结构：tag、id、class、允许的 data 属性、hidden、parent / children、child count、顺序与兄弟关系。
不保存完整 HTML、节点文字或控件值；data 属性不是天然安全，值必须白名单处理。限制范围、深度和节点数量，并报告截断。
Soft & Wet role、Fingerprint、Adapter level 和 Selector fallback 属于可选集成扩展，Generic 不要求或解释这些字段。

DOM Diff 报告节点增删、id / class / data / hidden、父子与顺序、可选扩展变化。不把页面冻结，不自动判根因或把正常 DOM 更新判为兼容失败。
Snapshot 与 Diff 应注明范围、schema 和匹配限制，无法可靠对应的节点报告不确定性。

Golden Screenshot / Visual Diff 首期输出当前图、参考图、diff 图和差异统计。
记录设备、viewport、页面、Visual Tier（目标可提供时）、字体与测试状态等比较条件；条件不一致时明确提示。
它是诊断工具，不是严格像素发布门槛，也不自动判定美观或兼容。游戏状态、背景、字体、平台和 WebView 都可能造成差异。

## 工具使用与升级顺序

人工现场由 scrcpy 与 `chrome://inspect/#devices` 配合；工具采证，不替代 Chrome DevTools 或自建 Trace Viewer。
scrcpy 只检测和提供工作流提示，不打包或自动下载；缺失不影响其他工具。开发会话入口首期只检查和提示，不自动打开多个窗口。
CDP 逐步补 Console warning / error、Runtime exception、结构快照、经处理的 URL、viewport、performance entries、Network 摘要及存储元信息；不默认读取存储内容。
Console / Network 捕获须注明监听时间窗口，不能承诺恢复监听前的事件。

| Skill 模式（规划） | 最小路径与升级条件 |
| --- | --- |
| quick-inspect | Screenshot → CDP / Inspect → 必要的 DOM；先弄清现场 |
| compatibility-diagnose | DOM contract → 已知版本 Diff → 可选 Adapter / Fingerprint / Runtime 解释；无集成仍可诊断结构 |
| visual-diagnose | Screenshot → Golden / Visual Diff → DOM / CSS；Soft & Wet 档位信息为可选补充 |
| performance-diagnose | gfxinfo / framestats 与 meminfo → Chrome Performance → 有异常线索再 Perfetto |
| full-evidence | 普通证据仍不足时扩大采集，按需选择录屏、trace、bugreport |

用户反馈优先轻量 Support Bundle。Skill 保存流程、决策规则、升级条件、风险、禁止动作与证据解释，不复制 Tools 实现。
遵循 Evidence First 和最小充分验证；已有现场证据足够时停止升级，不把每个问题都变成全量测试。

gfxinfo / framestats 是轻量帧诊断，meminfo 首期只采集和报告 PSS / RSS 等基础指标及观察趋势；上涨不能直接证明 DOM / Observer / Vue 泄漏。
Perfetto 按需检查能力、提供固定配置、保存 trace 与采集元数据，不进入普通 smoke。Logcat 默认限定时间、PID 或相关过滤，不保存完整系统日志。
Screenrecord 明确时长、仅本地、防覆盖。bugreport 属于明确选择的重型模式，说明体积和敏感设备信息风险。
UIAutomator 原生层 action / journey 与 inspect 分开；启动、返回、旋转、重启等有副作用操作不可混进只读采集。

Doctor 只报告环境可用性：Node / Python / ADB / Android CLI、设备冲突、package、WebView socket、CDP、run-as、scrcpy、Perfetto、端口和输出目录条件。
不自动安装、修环境或顺手抓业务证据；必要的端口转发或辅助 APK 安装单独说明副作用，不伪装成只读检查。
Evidence 不顺手修复环境，也不隐式部署 APK。

## 分批范围与验收方向

第一批：最小 Evidence 编排与 manifest；复用已有采集，扩展 CDP；gfxinfo / meminfo；限定范围的 DOM Snapshot / Diff；可选 Soft & Wet 诊断桥。
Evidence 编排先搭可运行的薄版本，随 collector 逐步增加内容，不等全路线完成再交付。
第二批：Doctor、限时录屏、filtered Logcat、Golden / Visual Diff、scrcpy 辅助与轻量 Support Bundle。
第三批：Perfetto、bugreport、明确的原生 action / journey、高级 Network。
顺序是路线，不表示一次性实现全部；开工时根据实际现有工具和用户补充确定具体首个交付。

重点验收包括：无 Soft & Wet 时 Generic 可用；集成缺失、未知版本或异常被隔离；明确设备选择；超时、防覆盖、部分失败保留；schema / 会话 / 时间 / 来源一致；默认脱敏不泄露测试中的敏感值。
离线测试、真实设备采集、视觉判断、游戏业务验收分别报告；静态通过不等于真机或游戏结果。
工具开发不修改 DoL-Game-UI。设备采证按用户授权执行；游戏业务与存档操作不因诊断被隐式授权。

新的公共接入、CSS/Environment、复现实验和专项时间线批次见 [BLUEPRINT](BLUEPRINT.md)。上面的首批路线保留作已有实现背景，不能限制最新授权的测试操作。

## Inspect 与测试操作

观察入口保持观察语义；点击、输入、导航、设置、启动/重启、横竖屏和生命周期实验属于独立 Action / Journey。明确测试档、测试账号、隔离 App 或临时数据环境后，按任务范围主动执行普通操作，不要求每步重新确认。
plan/dry-run 显示动作、目标、输入、等待、采证点和风险，不执行动作。执行时重新核对 selector 唯一性/节点与 App 身份，设置时限；失败保留证据并清理自身资源，不自动换设备。
真实存档/云端数据的删除或覆盖、真实 Mod 删除、正式用户数据清空和凭据修改仍需要对应显式授权。测试环境未明确时先核对，不自行把用户日常 App 当作隔离环境。

## 长期禁区

Inspect 默认只观察；明确测试环境中的任务相关普通游戏操作可以用于复现。不得不可逆破坏未授权的真实数据，也不得自动修改未知第三方 Mod。
不接管加载顺序、包管理、依赖解析或第三方生命周期，不恢复已停止的自有 Mod 管理器。
允许有限、可计划和可追溯的 Action / Journey；不因此构建通用业务 DSL、全页自动遍历、自动测试生成、自动修复、全局 DOM 镜像或另一套完整 E2E 平台。
不做中央数据库、云诊断平台、遥测、自动 Issue 上传或常驻后台服务。
现有通用 CDP evaluator 可执行指定脚本，不能因此宣称工具从技术上禁止所有写入；增强采集只运行经过检查的只读探针，不扩大为新的脚本执行产品。

目标：通用工具服务整个 DoL Mod 生态，项目专属诊断按需插入；Tools 获取现场并执行明确实验，Integration 提供自身解释，Skill 选择最便宜且充分的开发与验证路径。
