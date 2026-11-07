# PC 本地测试入口（7.0）

本页对应 Gold Experience 7.0 本地候选。PC Debug、共享 Action/Journey、GER Goal/Session 和标准 Evidence 已接入 owned Chrome。需要持久预算、受保护业务动作和原回执恢复时，使用共享 GER，不能把普通点击补记成 GER 派发。

## 启动与资源

使用 Node 26+、已安装的 Google Chrome、经审查且获准使用的 HTML。选择必需资源，不托管整个目录。以下环境变量分别替换成当前机器的绝对路径，输出父目录须已存在：

```sh
node scripts/dol-dev.cjs pc-start --file "$HTML" --resources "$RESOURCES" --chrome "$CHROME" --port 18767 --mode visible --out "$NEW_INSTANCE"
```

`--mode headless` 用于自动验证。`--resources` 可省略（只提供 HTML），清单格式如下；资源 file 是本机绝对路径，示例路径需替换：

```json
{"schemaVersion":1,"resources":[
  {"urlPath":"/assets/app.js","file":"/reviewed/test/app.js"},
  {"urlPath":"/assets/site.css","file":"/reviewed/test/site.css"}
]}
```

HTML 位于 `/index.html`，`/` 同样提供该文件。按 HTML 中真实相对路径填写资源 URL，支持空格、Unicode 文件名及对应百分号编码；拒绝目录穿越、编码斜杠、畸形编码和重复 URL。白名单支持 HTML、JS、CSS、JSON、常见图片、字体、音视频；不支持目录、通配符、隐式依赖发现或任意代理。最多512项附加资源、入口 HTML 128 MiB、其它单项64 MiB、合计512 MiB。启动时读取快照并记录摘要；修改磁盘文件后需要停止并新建测试实例，当前服务不会热更新。禁止将私人资源加入清单；这不是不可信代码沙箱，获准 HTML 中的脚本仍可使用浏览器能力或请求外部网络。

仅监听 `127.0.0.1` 和指定端口，不自动换端口；端口冲突明确失败。仅允许对应 Host 的 GET/HEAD，无目录索引或 CORS 开放。服务不注入会破坏游戏内联脚本的夹具 CSP。命令输出实际 URL、owned host.json 和浏览器 PID；清单摘要位于输出目录。Profile、日志、探针结果和截图均留本地，不默认上传。

保持启动命令运行。Ctrl+C、SIGTERM 或本轮 Chrome 退出后释放自己的 HTTP/Chrome；不处理日常 Profile，不自动删除任何 Profile。强制杀死宿主进程或断电不能保证清理；通过实例内 `chrome/launch.json` 和 host.json 核对原进程，不按进程名批量杀浏览器。启动失败也保留日志和记录；`PC_STOP_UNCONFIRMED` 表示退出尚未确认。

`PC_CLEANUP_UNCONFIRMED stage=pc.cleanup` 表示本轮某项资源清理未完全确认；浏览器或 HTTP 仍可能存在，不能直接重用实例、Profile 或端口。启动和清理同时失败时，HTTP 清理前的有限诊断仍保留在 `startup-failure.json`（若写入成功）；程序接口抛出的 `AggregateError.errors` 按原失败、清理失败排序，`cause` 保留首个失败，CLI 不回显这些原始异常。正常停止时也保留浏览器与 HTTP 的双重失败，包括 `false`、`null` 等异常值；仅浏览器失败则保留原异常。

Chrome 启动器在 CDP 关闭抛错时仍尝试停止自己创建的浏览器；在返回可用句柄前发生清理失败也不会放任浏览器继续运行而报告成功。日志 FD 各尝试关闭一次，某个失败不跳过其他 FD，也不重新关闭结果未知的 FD；未知 FD 是否实际已关闭仍无法保证。`launch.json` 尽量在日志 FD 关闭前保留进程身份，文件写入本身失败时仍可能没有该记录。清理不自动重试、删除 Profile 或处理其它浏览器。

## 初始绑定失败的定位记录

`PC_DOCUMENT_CHANGED` 保留原错误码。首次绑定在原就绪期限内未完成时，可以附带有限 `reason`：`initial-empty-document`、`initial-url-mismatch`、`initial-context-unavailable` 或 `initial-loader-unavailable`。它们只说明观测到的未就绪状态，不推断 Node、HTTP、GPU 或设备根因。已经建立的文档绑定失效仍沿原语义拒绝，不被归类为初始等待。

`pc-start` 在 HTTP 服务建立后、Chrome launch 拒绝时，会尽力在实例目录独占创建 `startup-failure.json`。记录只含固定诊断与 HTTP 计数，无路径、页面 URL、请求头、正文或原始异常；不能写入或已有同名文件时不覆盖、不替换原启动异常，也不跳过原有 HTTP 清理。其他直接绑定入口不保证产生这个文件。

HTTP 字段是关闭服务前的快照：`connections`、`requests`、规范首页 GET 的 `mainGetRequests`、`mainResponsesFinished`、`mainResponsesClosedEarly`。各计数到65535饱和，`truncated`说明丢失精确总数。HEAD、错误 Host 和其他资源不计入首页GET；Node默认 HTTP 解析错误处理不变。

结合原 `chrome/launch.json` 和本地 Chrome 日志，可以区分“尚无完整请求”“首页请求未完成响应”“响应已结束但文档仍未提交”等观测位置。服务计数不能归属于某个Tab，也不能证明浏览器已提交文档或脚本已就绪。`readyRecordReturned:false`只表示没有返回可用owned记录，不证明页面从未运行脚本，更不能结清GER副作用。记录不改变超时、目标选择、身份检查或重试策略，不默认上传。

F07历史两次空文档的物理原因仍未定位。受控扣住首页可重现相同表象，扣住脚本可得到另一种状态；这些控制与后续成功运行不能追认为旧失败根因已修复。

## 选页和新文档

```sh
node scripts/dol-dev.cjs pc-pages --host-file "$HOST_JSON"
node scripts/dol-dev.cjs pc-bind --host-file "$HOST_JSON" --target-id "$EXACT_TARGET_ID" --url "$EXACT_URL" --out "$NEW_HOST_JSON"
node scripts/dol-dev.cjs pc-observe --host-file "$NEW_HOST_JSON" --scope main --out "$NEW_EVIDENCE"
```

只列出 owned 浏览器的候选页面，不按标题或 URL 猜选。绑定必须明确 target ID 和完整 URL，且属于原 HTTP origin；输出必须不存在。多页同 URL 仍须明确 ID。刷新、hash/history 变化和导航使旧合同失效，必须重新观察并显式绑定。绑定核对进程、browser ID、Profile、target、origin、frame/loader/uniqueContextId；执行前后核对文档，页面表达式内再次核对完整 URL。断开不会取消已排队工作；原文档仍在时可显式重新连接，换文档则创建新合同。关闭原目标后不会采用替代标签。

## 动作与结果

```sh
node scripts/dol-dev.cjs pc-action --host-file "$NEW_HOST_JSON" --file "$REVIEWED_ACTION_JSON" --out "$NEW_ACTION_EVIDENCE" --test-environment yes
```

Action 格式复用 `web-click`、`web-focus`、`web-input`，例如 `{"type":"web-click","selector":"#purchase"}`。不支持 Android 原生动作。按目标串行调用，避免与 CUA、手动操作或另一个进程同时派发。普通 Debug 没有跨进程业务锁或去重；重复调用可以重复点击。需要预算和未决效果仲裁时使用下述 GER，不用本命令替代。

观察与动作均保存有界 DOM/CSS、截图、连接期间 Console/Network 元数据和文档身份。事件只覆盖本连接窗口，不保证捕获启动前错误。默认不读取正文或输入值；截图、URL 和可选状态探针仍可能包含私人内容。

多步复现使用现有 `journey --file REVIEWED_JSON --host chrome --host-file ABS_HOST_JSON --out NEW_DIR --test-environment yes`，单步也可使用 `action` 的同一入口。计划格式与等待合同见 [ACTIONS](ACTIONS.md)。Chrome 支持 screenshot、dom、css、console、network、storage、environment、web-performance 八类检查点；其它请求明确记为 unsupported，并停止后续步骤。共享截止预算适用，超时不重放动作。派发前在 manifest 写保守 Unknown，正常 ACK 后更新；进程中断不代表取消或零副作用，没有断电 fsync 或业务去重保证。

可选 `--probe ABS_REVIEWED_JS` 读取获审的页面表达式，例如测试页的 `window.neutralWorkshop.read()`。表达式在页面执行，工具不证明它只读，不是权限沙箱。其摘要与执行前后结果留本地供独立核对；不要把源码中的预期值当现场结果。

派发前写入本地 manifest；进程中断时 `dispatching-unknown` 保留不确定性，无自动重放。`dispatch-acknowledged` 只说明该次原动作收到确认，`businessOutcome` 始终不自行推断。后续证据失败不抹掉已经收到的 ACK。它不是 Effect Ledger，也不自动结清旧 GER pending。持久受保护操作必须由一个协调器派发，并读取同次操作的原业务状态/回执。

## 保留进度与跨机器

默认保留独立 Profile。原浏览器完全关闭后，在新的输出目录使用同一 HTML/资源、同一端口和 `--resume-from ABS_OLD_HOST_JSON`；工具复用原 Profile，默认要求相同 origin 与资源摘要、旧 PID/端点不再运行。源码修改经审查后可同时使用 `--allow-resource-update yes`，仍要求相同 origin，记录前后资源摘要，建立新的 browser/document 合同；这不结清旧待定动作。保留 Profile 也保留 Service Worker、Cache Storage 等状态，HTTP 摘要证明服务端快照，不能单独证明浏览器实际加载版本；更新后必须检查页面自身的加载标识或实际行为，不自动清空缓存。端口变化应明确作为新测试环境，不能把新 origin 的空存储误判为丢档。

Windows PowerShell 同样调用 `node scripts/dol-dev.cjs ...`，变量用 `$HTML` 等，Chrome 路径如 `C:\Program Files\Google\Chrome\Application\chrome.exe`。清单中的 file 必须换成 Windows 本机路径；JSON 可用 `ConvertTo-Json` 生成。host.json 含本机进程和 Profile 身份，不作为另一台机器可直接重用的连接文件。Chrome 为外部可选依赖，不安装 SDK/ADB。

## 共享 GER 与标准 Evidence

```sh
node scripts/dol-dev.cjs game-goal-start --host chrome --host-file "$HOST_JSON" --file "$REVIEWED_GOAL" --store "$SHARED_SQLITE" --out "$NEW_GOAL" --test-environment yes
node scripts/dol-dev.cjs game-session --goal "$NEW_GOAL" --operation request --test-environment yes
node scripts/dol-dev.cjs game-session --goal "$NEW_GOAL" --operation propose --file "$REVIEWED_CURRENT_PROPOSAL" --test-environment yes
node scripts/dol-dev.cjs game-session --goal "$NEW_GOAL" --operation dispatch --test-environment yes
node scripts/dol-dev.cjs evidence --host chrome --host-file "$HOST_JSON" --out "$NEW_EVIDENCE" --scope main --css yes --storage yes --environment yes --web-performance yes
```

GER 依赖根目录锁定的 XState/Node SQLite，沿用 [GAMEPLAY](GAMEPLAY.md) 的完整 Decision、预算、fencing、Memory、Effect Ledger 与原终态规则。Session 存储最初的 target/document；后续 request/resume/reconcile 不重新读取 host-file，不自动接受新文档。刷新、hash、导航、重启或更换标签后旧 Session 安全拒绝，旧 pending 保留。新 Session 仍共享整个 Profile 的 targetKey；换标签、origin、浏览器实例或绑定不能解除同 Store 中的未决效果，换 Store 也不是隔离证明。

Chrome 的 Profile 路径摘要和资源摘要不是数据世代证明；不填充 Android nativeIdentity/resourceGeneration，也不声称识别所有原地清存储或游戏数据重置。当前合同限定最初的 live browser/document，不能把 Android pending 迁移到 PC。已持久结算的页面回执仅在所属 Chrome 执行上下文的批次中回收，其他标签不能代为确认；未决回执不参与回收。

受审项目 Recipe 可使用 Chrome scope：`host:"chrome"`、绝对 `workspace`、选定 `profileId`、完整 `origin`、明确 `intents`、`dataDomain:"chrome-origin-storage"`。这记录宿主已授予的数据/任务范围，不自行授予权限，不接受 Android 占位 serial/package/signer 或 data-reset。详见 [项目 Recipe](PROJECT_EXPERIMENTS.md)。原生 DoL Provider 保留源码/函数指纹及终态要求；未匹配的游戏版本不会退回普通点击。

标准 Evidence 保存 incident、原 target 的去路径身份摘要、通用采集和每步完整性；Android 专属请求标 unsupported。已审查的可选 Integration 可通过原 `--integration` / `--integration-file` 入口在 Chrome worker 中执行，固定原 target/document；导航或模块失败不使已完成的通用采集失效，详见 [Integration 文档绑定](INTEGRATIONS.md#chrome-原文档绑定)。Chrome 环境仅含 browser/runtime，不补造 Android 元数据；Compare/Known Good 的完整性要求见 [EVIDENCE_TOOLS](EVIDENCE_TOOLS.md)。

## 验证范围

Windows Chrome 156 的多标签实验中，后台页面的截图曾超时；简单后台页对照未复现，完整流程的协议追踪确认超时命令为 `Page.captureScreenshot`。工具不会为截图自动切换前台，后续采集失败仍保留已收到的动作 ACK；不要因此重放点击。PC 夹具将同 URL 干扰页明确设为后台，选页和干扰页状态断言保留。该编排调整不证明所有后台截图问题已解决。

无内容 Debug 回归：`node experiments/tusk-act4-7/pc/verify.cjs ABS_CHROME NEW_OUTPUT headless`（也可 `visible`）；正式 GER/Evidence 中断恢复回归：`node experiments/tusk-act4-7/ger/verify.cjs ABS_CHROME NEW_OUTPUT`。`PAISLEY_TOOL_ROOT` 可指定独立解压包验证同一流程。GER 夹具只模拟原始状态 API、受审 Recipe 和公共元数据，没有游戏/Mod 源码。该段命令验证受控夹具，不包含真实游戏。Windows Chrome、真实 DoL 代表保存/导航与独立 Android 原回执恢复另有对应记录，见 [7.0 支持范围](CLOSEOUT_7_0.md)；不同实验的结果不能互相代替。
