# DoL Dev Tools 4.0 — Bites the Dust 开发记录

状态：开发中，未发布。稳定基线为正式 3.0.3，`c5363060efdde8b724a5bbc8df3dd5140c32ca09`；开发分支 `development/bites-the-dust-4.0`。Tusk ACT4/3.5 不再作为研发计划；其历史实验记录保留，只复用与当前合同直接相关的已审实现和测试。

## 本轮范围与 Done

主计划为用户交付的 Bites the Dust 最终执行计划书：Debug 与 GER 同批放权，既有 Runtime/Effect Ledger 内收口可选消费、项目实验能力、存档/自动保存、重复探索、目标重绑与真实数据代次；定向修复 Q1a/Q1b/Q2/Q3；复用 Android CLI/Skills/KB；真实 Bug 自主修复、制品对照及失败恢复。全部约定切片验收后才称正式 4.0 完成。当前只完成下表中的首批实现，不能提前宣布正式版。

保留原 CLI/Skill/Store/TargetKey 身份。指定测试 App 的范围授权已由用户确认，运行前重新核对设备/user/package/签名和数据域；授权随正常重载继承，执行绑定不静默跟随新文档。正式仓库、旧实验、已安装 3.0.3 和历史未决记录不变。本计划未授权推送、合并、公开 Tag/Release 或公开上传现场证据。

## Delivered / 首批实现

| 切片 | 当前实现与证据边界 |
| --- | --- |
| A2 可选消费 | 新请求未设上限持久化为 null；显式零/有限值保留；父子取有效较小限额；候选、准备、结算、完成、view、SQLite/新宿主恢复一致。旧字段缺失按零读取，读取本身不改写原记录；3.0.3 无法反向读取新 null 合同。 |
| A5 重复探索 | 三次无进展改为 routeHints；第四、第五次已结清实验可继续，resume 不恢复硬封路；未决副作用限制保留。 |
| A3 项目实验 | 既有 CLI request/propose/dispatch 可达的单一项目 Recipe Provider；按宿主已授权工作区、device/App/user/签名摘要/data domain/intent 核对；文件和函数源摘要进入候选和旧 binding。独立 read/quote/execute/Outcome，最终仍用原生 Goal Predicate；没有第二个 Runtime/Ledger。源码变更先 fresh observe，旧 terminal 不依赖新源码，旧 started 不被新源码追认。详见 [配方合同](PROJECT_EXPERIMENTS.md)。 |
| Q1a 决策预留 | 复用 SQLite 事务内 approved snapshot CAS；预留后执行 Effect 的 action；两个 SQLite 连接替换 A/B 提案时零点击、零新增 effect。 |
| Q3 回执生命周期 | 仅回收可靠持久结清后匹配的 terminal；按 namespace owner 在 LIMIT 前筛选，避免异类历史占满候选；同页面 66 Session 连续执行，清理响应丢失和清理后确认中断可恢复，started/Unknown 保留。 |
| Q1b 实际调用 | 点击型原生 producer 绑定实际 DOM receiver 与原生 click callable；最终边界复核，使用捕获函数与明确 receiver 调用；替换/getter 在调用前拒绝，跨开始标记后的错误仍 Unknown。Soft & Wet 原生 head 的 UI 回调继续使用已有捕获函数/对象合同。普通 Debug click 不被强制加入这些认证。 |
| Q2 零派发与 Unknown | 已审本地操作通过不可序列化的进程内 provenance 与显式开始标记保留可信 preflight 拒绝；标记后失败不降级。任意操作返回 guardRejected、复制 operation 对象或页面声明零效果均不能取得该语义。不是权限旗标、脚本沙箱或新的审批。 |
| Android layout | ENOENT 单独 unsupported；权限拒绝/进程终止/执行失败/输出超限/无效 JSON/无效布局分别 failed；不输出私人 stdout/stderr，不从错误文本猜测目标状态。 |
| Android Document | execution-context 复用已有不可变 frame/loader/unique context 合同；同 PID/target 重载也拒绝旧持有者。仅显式 closeTransport 或新上下文建立新绑定；不静默重连，不改变 TargetKey/历史账本，不引入 ChromeHost。 |
| Skill/Workshop | 明确 Debug 路由、一次范围授权、禁止伪造证据与允许独立状态准备的区别；Android 工具/Skill/KB 来源分别记录；未实现的 GER 合同不由授权旗标代替。 |

这张表为离线实现状态。没有把 Node/替身 DOM/合成历史测试当成本轮真实 Android 或 Gameplay 通过。

## Validated / 2026-10-11 Windows 本地

- Node 24.19.0、Python 3.14.7、锁定 XState 5.33.2；复用正式基线的已有 node_modules，以每次进程的 NODE_PATH 指定，不安装新依赖。首批实现本地提交 `70eef54f9cdafe3e71b074be5a605d695522d543`；后续 Q1b/Q2 在同一开发分支提交，以实际 HEAD 和日志定位。
- 核心跨模块变化执行完整离线 Node 套件：首批 347 passed；Q1b/Q2 新变更后的最终结果 352 passed、0 failed、0 skipped。Python：2 passed、2 skipped，Pillow 与 JSON Schema/date-time 可选开发依赖缺失；代码未受后续变更影响，复用已有结果，未补装。
- 定向回归先执行，再全套。首轮保留一条旧“必须填写消费上限”断言失败，按新约定替换为零/有限/不限及旧记录测试。新增报价授权夹具首次输入格式不完整已修正；回执容量实验首次未在普通 request 观察入口执行维护，已接线并通过。不用跳过、吞错或重复跑至绿隐藏原因。
- 日志在本轮 ignored `artifacts/bites-the-dust-offline-20261011/`，依代码变化更新实际结果；目录不包含游戏存档/资源。独立测试所建 SQLite 连接先关闭，目录后清理。
- Android CLI 实际版本 1.0.16486076；本轮运行 version、docs help、skills help，未运行设备动作或 KB query。help 显示存在 search/fetch 与 Skill 管理入口，不能将其写成 KB 查询或实机采集通过。
- Android 文档绑定变更：定向 68 passed；完整 Node 359 passed、0 failed、0 skipped。复用的 Android 修复来自历史 Tusk 源码，仅取 Android 分支；首轮移植混入 Chrome 分支及 Python 默认编码失败已修正，失败日志保留。后续失败来自旧替身连接重复使用已关闭客户端、未转交事件参数及旧“零身份事件”断言，已更新夹具；不放松生产绑定。Python 未涉及，复用前述结果。
- 项目 Recipe CLI 通过注入的替身 Android/CDP 执行完整入口，未调用真实游戏；验证执行确认/副作用/Goal 三层分离、源码迭代、未决保护、旧终态恢复及 Scope 身份拒绝。新测试发现预算外候选仍会展示，已在既有 Runtime allowedAction 统一按有效限额过滤，准备/派发仍保留预算检查；不是放宽限制。异步 preflight 在 await 后重新核对 root/namespace，避免旧接收者执行。
- 项目 Recipe 最终定向 60 passed，完整 Node 367 passed、0 failed、0 skipped；Python 代码未改，复用已有结果。失败的显式零预算候选展示检查保留于 project-targeted-second.log；源代码收口后通过，未修改预期或跳过。

## Not validated / 本轮未覆盖

除下述已运行的文档身份和布局外，当前变更的其它真机验收、正式构建/部署/加载身份、真实游戏业务及存档、APK/数据恢复尚未执行。现有历史现场不计入本轮通过。

### 已运行的 Android 代表验证

固定源码 `5b281b10864d9b865f63f56f23410a1a36125256`，2026-10-11 本轮已授权测试 App、user 0、Android 17、WebView 154.0.8037.58。ADB 1.0.41、Android CLI 1.0.16486076。现场序列号、APK/证书 SHA256 和加载身份在本地 `artifacts/bites-the-dust-document-20261011/`；APK 仅为签名核对所读的现场制品，不公开或写入 Git。

- 标准 Action 启动成功；一次 Page.reload：PID、frame、URL 摘要不变，loader、unique context、timeOrigin 变化。旧生产 evaluate/send、旧 context/object 与 ensureWebview 均拒绝；显式新绑定成功；10 项检查 passed，未派发业务点击、未调用存档 API、不写 GER Store。游戏启动/重载自身的持久化未验证。旧、新自有 forward 清理完成，预存映射未改变；不宣称设备断连恢复。
- 标准 native-layout 在 helper 已有范围授权下完成；结果只证明本次当前窗口采集，不证明全部原生控件/弹窗或 CLI trusted touch。
- 实际 `android skills list --agent codex --long` 发现已安装 Android CLI Skill；使用 Skill 及 interact 引用的内容 SHA 记入 provenance。没有安装或升级 Skill/工具。
- 实际 KB query 和 fetch 完成，`kb://android/develop/ui/views/layout/webapps/debugging`。KB 只支持工具选择说明，不证明本次 Document 合同；原 query、结果、检索时间、Android 版本及来源 SHA 保存在 provenance，不冒充官网浏览或设备事实。

Q1b/Q2 已实现，真实 WebView 定向验收未执行；替身 CDP 的原生源码文本断言仅验证本地合同，不替代真实宿主验证。Q1b 首轮新增测试语法错误及旧 toy CDP 不支持函数 object 的失败已定位修正，原失败日志保留为 q1b-targeted.log / q1b-node.log，最终通过另存 q1b-node-final.log。

## Remaining implementation / 尚需完成

- A3 已有离线 CLI/合同实现；真实项目 Recipe 派发、真实免费交易与更多 Goal/领域组合仍需本轮代表验证，不能据此宣布完整放权完成。
- A4 存档/自动保存复制 guard 的实际放权与代表操作合同。
- A6 稳定范围授权和可核验数据代次在实际写入/持久合同的接线；原 Pending/Unknown 保持可见，不能换库或虚构 UUID 绕过。
- A1/Android 协作的代表性实机验证，以及 B/C 真实问题修复、旧/错制品对照、一次真实实验失败后的恢复继续。

## Known limitations / Case 调查

Dol UI 已提供当前 2.5.0 工程和真实旧制品/历史存档闪烁证据，同时确认该缺陷已修复，当前没有已证实仍未修复的 Core UI Bug。材料只登记为历史缺陷重放/制品对照候选，不能当作当前未修 Bug，也不为制造验收重新开发已完成补丁。新环境是否能重现旧制品仍 Unknown；当前实际 Bug 选择未定，不阻止离线 A 切片继续。具体路径、SHA 和设备历史保持在本地 Case 记录，不公开私人现场。
