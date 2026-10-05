# DoL Dev Tools：增强路线与架构约束

2026-10-05。长期架构与原始分批路线；1.0 当前交付以 README、DIAGNOSTICS 和 VALIDATION 为准。
本文整合完整增强路线、通用核心与专属集成边界、通用诊断补充约束和 Tools + Runtime + Skill 定位。
本文不是当前功能清单；当前命令与验证范围见 README。开工前核对实际脚本和接口，不把路线中的能力视为已经可用。

## 三者职责

| 部分 | 职责 | 边界 |
| --- | --- | --- |
| DoL Dev Tools | 获取 Android、WebView、DOM、性能和日志现场，形成本地证据 | 面向所有 DoL Mod 作者，不依赖 Soft & Wet 或其源码目录 |
| Soft & Wet UI Runtime | 理解与适配 UI，提供自己的只读诊断解释 | 留在 DoL-Game-UI；只管 UI，不拥有游戏状态、Mod 生命周期、存档、云事务、依赖解析或包管理 |
| DoL Development Skill | 选择工具、诊断顺序、升级条件、风险与证据解释 | 调用 Tools，不复制实现，不成为工具执行器或第四个框架 |

工具包继续独立维护。已有可用脚本保留，统一 CLI 逐步包装它们，不为统一入口重写全部脚本。
Skill 已随 1.0 放在 `.agents/skills/dol-dev-tools/`，不自动全局安装。

## 通用核心与可选 Integration

Generic Diagnostics 包含 Android CLI、ADB、CDP、Chrome Inspect 辅助、视觉采集、Console / Network、Logcat、性能、DOM、Visual Diff、Device / App / WebView、Doctor 与 Evidence。
即使完全没有安装 Soft & Wet，通用层仍可独立工作。某个设备或工具能力不可用时如实报告；“通用”不意味着所有采集必然成功。

`integrations/soft-and-wet/` 后续只放诊断桥、采集器和证据格式，不搬入 Runtime 实现。通过公开接口读取 Runtime Inspector、Adapter、Fingerprint、Selector fallback、Role Mapping、Adaptation Level、Degrade Reason、Surface 与 Compatibility Events。
在建接口按实际版本、方法和能力检测；不能仅凭 UI 版本号假设所有增量接口存在或已经验收。不得访问内部 Vue store 或维护第二套诊断状态。

薄 Integration 契约只需表达：

- `detect`：目标是否存在。
- `describe`：集成名称、版本、能力和支持状态。
- `collect`：读取自己的诊断。
- `redact`：集成字段的脱敏规则或处理，仍须经过聚合层策略。

状态区分 `available / unavailable / unsupported / failed`。未知版本明确说明支持范围，不猜测内部接口。
缺失或异常的 Integration 不阻断 Generic Evidence。未来第三方可自维护或外置 Integration；首版不做插件市场、自动发现或依赖解析。

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

## 长期禁区

默认只观察，不购买、换装、加载或删除存档、推进剧情、点击危险控件、写游戏变量或修改第三方状态。
不接管加载顺序、包管理、依赖解析或第三方生命周期，不恢复已停止的自有 Mod 管理器。
不做通用业务 DSL、全页自动遍历、自动测试生成、自动修复、任意脚本执行器、全局 DOM 镜像或第二个 E2E 框架。
不做中央数据库、云诊断平台、遥测、自动 Issue 上传或常驻后台服务。
现有通用 CDP evaluator 可执行指定脚本，不能因此宣称工具从技术上禁止所有写入；增强采集只运行经过检查的只读探针，不扩大为新的脚本执行产品。

目标：通用工具服务整个 DoL Mod 生态，项目专属诊断按需插入；Tools 获取证据，Runtime 解释 UI，Skill 选择最便宜且充分的诊断路径。
