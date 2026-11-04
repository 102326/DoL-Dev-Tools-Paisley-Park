# ACT4 PC 重新验证

2026-11-04。**值得作为下一版 Paisley Park 的 PC 接入路线继续做。保留精确文档绑定、共享 Action/GER 和原结果恢复；简化启动、选页与显式重新绑定。无需原样复活整个旧分支。**

本轮是独立实验，没有改正式 CLI、GER、Store schema、版本号、全局 Skill 或日常 Chrome 配置，没有提交或推送。当前主线基础 `91eb9b0500152e9d055f1424074698db3bf43560`；ACT4 历史固定 `52a8893910c57ed420587c137472ffb008567b18`，独立只读源码副本。私人维护文件保持原样。

## 当时实现了什么、卡在哪里

ACT4 已把 owned Chrome 接到共享执行上下文、Action/Journey、GER Session、SQLite、标准 Evidence。具备浏览器/Profile/target/origin/frame/loader/uniqueContextId 绑定、原回执核对、pending 保留和重复派发拒绝。Chrome 不支持的 Android 能力明确 unsupported，不编造 Android 身份。

限制有两层：

1. 历史 `cua.getTab` 对已有个人 Chrome 的 `file://` 游戏页面，在执行任何点击/脚本前被协议策略拒绝。此前复核报告记录原文为 `The requested URL protocol is not allowed. Allowed protocols: "http:", "https:".`。停止那个操作正确，不能据此判断 PC 路线整体不可行，也不能换入口绕过同一被拒绝目标。
2. ACT4 自身 launcher 与 runtime-target 只接受带端口的 `http://127.0.0.1`，新独立 Profile、headless。没有供普通用户接管任意个人浏览器的正式命令。刷新/导航后旧绑定拒绝是有意的保护；缺少方便的新合同接续入口才是体验问题。

历史依据：本机下载目录的《ACT4_PC测试能力与历史阻塞复核报告.md》（2026-11-04），以及[固定源码与交接](https://github.com/102326/DoL-Dev-Tools-Paisley-Park-Tusk-ACT4-Test/blob/52a8893910c57ed420587c137472ffb008567b18/docs/TUSK_ACT4_M4_HANDOFF.md)。前者记录 Windows Chrome 155 / 独立 Profile / HTTP / CLI / SQLite 的 11＋3＋1＝15 组检查。取回仓库本身只收录 Mac 11 组；Windows 原始执行日志未在本轮取得，15 组作为历史复核依据，不混成本轮运行。

同一复核报告记录 The Hand 在 2026-11-02 用 Windows / Chrome 156 / DoL 0.5.12.13 / 27 Mod 进行了五组各三次真实启动对照，检查指纹、业务克隆、清理及可见界面；其实际路线使用本机 HTTP。此次另读 The Hand 当前 E01、E02–E05 与设备记录：这些页面主要记 Mac/Android 条件，不能拿其中 23 Mod 或后续实机数值替代 Windows 那轮 27 Mod。未获取游戏资源，未把启动对照当成完整玩法/存档/GER 恢复验收。

## 本轮实际结果

环境现场读取：macOS ARM64，Node 26.13.0，已安装 Google Chrome 156.0.8078.73。Codex 走原生 Chrome AX/UI；本会话浏览器工具清单只有 IAB/MCP Apps，没有 Chrome 扩展 tab 入口，不将这种入口缺失称为浏览器拒绝。ACT4 使用相同已安装 Chrome 的独立 headless 进程、独立 Profile，截图另核。两侧使用同一自建 HTML，分别运行独立测试数据。

| 检查 | 实际结果 |
| --- | --- |
| 原样 M2 CLI 夹具 | 11/11，通过真实 CLI、GER、SQLite、进程 SIGKILL、原回执恢复；购买只一次 |
| 原宿主定向回归 | 9/9，覆盖文档/context、target、Profile pending 与 Android identity 不变 |
| 新场景实验 | 18/18，完整机器结果见 results.json；原 Host 原样检查先执行，随后才用新 helper |
| Codex 可见 UI 流程 | 进入工坊→制作→保存→重置→读取，实际恢复 workshop / count 1 / revision 2，AX 内状态与可见数字一致 |
| Codex 已有/新标签及同标题干扰 | 新建 native 和 decoy-native，接回已有 native，decoy 仍 room / 0；完成后只关闭这两个测试标签 |
| Codex 刷新、导航、重新获取 App | 文档 ID 分别变化；重新读取保存值仍 workshop / 1；重新获取 App 后 URL 和状态正确 |
| Codex 异步与普通点击 | 队列先显示 count 1，稍后原操作成 count 2 并有 receipt；再次普通点击成 3，没有内建业务去重 |
| ACT4 相同保存/读取流程 | DOM 与页面闭包实际状态交叉核对，结果同 UI 流程 |
| ACT4 多标签 | 指定 target 不动 decoy；同 URL 重复标签拒绝猜选，明确 target ID 可连接；关闭原目标不采用替代标签 |
| 原 Host 断连/重连 | 未换文档时显式重连成功；派发前断连拒绝，状态未增加 |
| 原 Host 刷新/导航 | 同 URL reload 后旧 evaluate/open 均拒绝；导航后亦拒绝，不能自动复用旧合同 |
| 新 helper 显式绑定 | 核对原 owned 浏览器、同 origin、target ID、完整 URL；新建文档绑定成功；旧 URL 拒绝；产生新 host.json 可被原正式 parser 接受且不可覆盖 |
| 操作已发生、ACK 丢失 | 页面 count 1→2、原 receipt 已出现，然后断连接收到 CDP_CONNECTION_CLOSED；显式重连读取原 terminal，全程不重发该未知操作 |
| 重复执行 | 同 attempt 的夹具 handler 拒绝重复；移除 attempt 后两个普通点击 count 2→4，明确不是浏览器 exactly-once |
| 保存、刷新与回执 | 新文档显式读取保存值 count 4，原 receipt 保持原 documentId；这只是自有页保存模型，不是跨 DoL 存档的连续性证明 |
| 排队后断连 | 断连后页面工作仍执行；只观察直到 count 5，不补点 |

失败与修正保留：首次沙箱内 `listen 127.0.0.1` 返回 EPERM，零检查启动。经正式审批入口允许本地服务/独立 Chrome 后原样 11 项完成。后续新实验固定等 900ms 曾在第 16 项读到 4 而失败；诊断轮记录页面 hidden，916ms 仍 4，979ms 原操作到 5。证明固定等待不能作为完成断言；未证明浏览器内部具体调度原因。改为有界读取同一次操作终态，不重试点击。最终轮及失败轮分别保留，没有覆盖旧结果。

自建页面不含游戏素材、文本、Mod 或玩家存档。原 M2 的 SQLite pending 在其独立 artifacts 中保留，不删除 Unknown。新 helper 只管连接，完全不调用 GER settle/resume/cancel，不解除 pending。

## 保留与简化

| 设计 | 建议及原因 |
| --- | --- |
| exact target + immutable document + unique context | 保留；真实刷新/导航实验确认旧合同确实失效，避免误点替代页面 |
| GER prepare/claim/guard/terminal/pending 与预算 | 按业务需要使用；真实进程死亡后仅执行一次是实际收益，不用重写 Runtime |
| 普通诊断/开发点按钮也必须完整 Goal | 不需要；沿用当前 6.1 Debug/Action 与工具选择，普通 UI 任务直接用 Codex |
| 只允许 launcher 创建第一张标签 | 改为显式 owned-browser attach/bind；本轮 helper 已证明可接已有其他页、新文档及正式 host parser |
| 刷新后一律没有接续路径 | 保留旧合同拒绝，增加“重新核对→新合同”操作；观察接续与旧 effect 结清分开 |
| 全 Profile 的 pending 锁 | 目前保留；确实防止换 Tab 隐藏未决。多标签并行时偏保守，只有实际阻碍独立任务且有可信数据域证明时再细化，不能靠 tab ID 直接拆锁 |
| file:// 扩展支持 | 本轮未实现，不通过放松 origin/安全策略解决；允许的独立 HTTP 测试环境已可推进核心使用场景 |
| headless-only 启动 | 原样可测且可截图；面向日常调查仍建议显式可见模式，需另验启动/清理，当前 helper 没有伪称支持 |
| 再建 Host Runtime/工具包装平台 | 没有证据需要；本轮只加小 helper 和夹具，直接复用原 Host/CLI |

## Codex 与 ACT4 怎么配合

Codex 原生控制适合查看真实画面、理解界面、现场定位和操作测试按钮。刷新后可以重新观察再继续，代价是 AX 索引会变化、当前焦点可能改变；本轮开始时工具曾要求刷新 App 状态，重新读取后才继续。它不是数据库或游戏业务结果协调器。

ACT4 适合可复跑操作、精确 document fencing、检查点、业务预算、受保护动作与中断恢复。普通点击也会重复，只有具体 provider/原 handler/原 receipt 合同能判断发生了什么。

建议组合：Codex 找到并确认场景；对照实际 URL/target/document 后把获审动作交给共享 Action/GER；Codex 再看可见结果，provider 读取游戏原状态和 terminal。一个受保护 effect 只由一个协调器派发；不可把 CUA 点击后另外“补记”为 GER 已成功，也不让两边同时派发同一业务动作。本轮分别对同一夹具流程做对照，没有声称完成 CUA 同页交给正式 GER 的产品级桥接。

## 下一版接入判断

值得纳入下一版研发：把 PC 作为现有执行上下文的另一 Host，先提供清晰的 owned launch/attach/explicit rebind 和 Debug/Evidence，再对实际 DoL 场景验证现有 provider。当前主线没有 ChromeHost 正式入口，不能把历史仓库与本实验当作已集成的下一版。

需要的产品开发包括：将小 helper 的接口和错误提示纳入当前分支、确认可见启动与当前 6.1 Action/证据兼容、清楚显示页面与数据域/旧 pending、在 Windows 跑真实 navigation/terminal/recovery。无需移植旧实验框架或重新建立 SQLite/状态机。最终模块边界以 Windows 原生合同结果决定。

本轮已交付原样复核、可重跑新夹具与显式绑定原型；Mac 代表场景已验证。未验证当前 Desktop Chrome 扩展 getTab、个人 Profile attach、file://、Windows 本轮执行、真实 DoL 业务与存读档、完整 CUA→GER 桥、性能或发行。Windows 直接接续步骤见 [WINDOWS.md](WINDOWS.md)。
