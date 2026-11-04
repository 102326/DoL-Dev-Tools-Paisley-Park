# PC 本地测试入口（7.0 开发中）

这是 `experiment/tusk-act4-7` 的开发能力，正式发行版本尚未改变。PC Debug 入口复用当前 CDP、DOM/CSS、事件摘要和 Web Action；共享 Journey 已接 Chrome，GER 还未接入。需要持久预算、受保护业务动作和原回执恢复时，不能把这里的普通点击冒充 GER 派发。

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

HTML 位于 `/index.html`，`/` 同样提供该文件。按 HTML 中真实相对路径填写资源 URL，支持空格、Unicode 文件名及对应百分号编码；拒绝目录穿越、编码斜杠、畸形编码和重复 URL。白名单支持 HTML、JS、CSS、JSON、常见图片、字体、音视频；不支持目录、通配符、隐式依赖发现或任意代理。最多512项附加资源、单项64 MiB、合计512 MiB。启动时读取快照并记录摘要；修改磁盘文件后需要停止并新建测试实例，当前服务不会热更新。禁止将私人资源加入清单；这不是不可信代码沙箱，获准 HTML 中的脚本仍可使用浏览器能力或请求外部网络。

仅监听 `127.0.0.1` 和指定端口，不自动换端口；端口冲突明确失败。仅允许对应 Host 的 GET/HEAD，无目录索引或 CORS 开放。服务不注入会破坏游戏内联脚本的夹具 CSP。命令输出实际 URL、owned host.json 和浏览器 PID；清单摘要位于输出目录。Profile、日志、探针结果和截图均留本地，不默认上传。

保持启动命令运行。Ctrl+C、SIGTERM 或本轮 Chrome 退出后释放自己的 HTTP/Chrome；不处理日常 Profile，不自动删除任何 Profile。强制杀死宿主进程或断电不能保证清理；通过实例内 `chrome/launch.json` 和 host.json 核对原进程，不按进程名批量杀浏览器。启动失败也保留日志和记录；`PC_STOP_UNCONFIRMED` 表示退出尚未确认。

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

Action 格式复用 `web-click`、`web-focus`、`web-input`，例如 `{"type":"web-click","selector":"#purchase"}`。不支持 Android 原生动作。按目标串行调用，避免与 CUA、手动操作或另一个进程同时派发。普通 Debug 没有跨进程业务锁或去重；重复调用可以重复点击。需要这些保证时等待共享 GER 接线，不用本命令替代。

观察与动作均保存有界 DOM/CSS、截图、连接期间 Console/Network 元数据和文档身份。事件只覆盖本连接窗口，不保证捕获启动前错误。默认不读取正文或输入值；截图、URL 和可选状态探针仍可能包含私人内容。

多步复现使用现有 `journey --file REVIEWED_JSON --host chrome --host-file ABS_HOST_JSON --out NEW_DIR --test-environment yes`，单步也可使用 `action` 的同一入口。计划格式与等待合同见 [ACTIONS](ACTIONS.md)。Chrome 支持 screenshot、dom、css、console、network、storage、environment、web-performance 八类检查点；其它请求明确记为 unsupported，并停止后续步骤。共享截止预算适用，超时不重放动作。派发前在 manifest 写保守 Unknown，正常 ACK 后更新；进程中断不代表取消或零副作用，没有断电 fsync 或业务去重保证。

可选 `--probe ABS_REVIEWED_JS` 读取获审的页面表达式，例如测试页的 `window.neutralWorkshop.read()`。表达式在页面执行，工具不证明它只读，不是权限沙箱。其摘要与执行前后结果留本地供独立核对；不要把源码中的预期值当现场结果。

派发前写入本地 manifest；进程中断时 `dispatching-unknown` 保留不确定性，无自动重放。`dispatch-acknowledged` 只说明该次原动作收到确认，`businessOutcome` 始终不自行推断。后续证据失败不抹掉已经收到的 ACK。它不是 Effect Ledger，也不自动结清旧 GER pending。持久受保护操作必须由一个协调器派发，并读取同次操作的原业务状态/回执。

## 保留进度与跨机器

默认保留独立 Profile。原浏览器完全关闭后，在新的输出目录使用同一 HTML/资源、同一端口和 `--resume-from ABS_OLD_HOST_JSON`；工具复用原 Profile，默认要求相同 origin 与资源摘要、旧 PID/端点不再运行。源码修改经审查后可同时使用 `--allow-resource-update yes`，仍要求相同 origin，记录前后资源摘要，建立新的 browser/document 合同；这不结清旧待定动作。保留 Profile 也保留 Service Worker、Cache Storage 等状态，HTTP 摘要证明服务端快照，不能单独证明浏览器实际加载版本；更新后必须检查页面自身的加载标识或实际行为，不自动清空缓存。端口变化应明确作为新测试环境，不能把新 origin 的空存储误判为丢档。

Windows PowerShell 同样调用 `node scripts/dol-dev.cjs ...`，变量用 `$HTML` 等，Chrome 路径如 `C:\Program Files\Google\Chrome\Application\chrome.exe`。清单中的 file 必须换成 Windows 本机路径；JSON 可用 `ConvertTo-Json` 生成。host.json 含本机进程和 Profile 身份，不作为另一台机器可直接重用的连接文件。Chrome 为外部可选依赖，不安装 SDK/ADB。

## 验证范围

无内容真实 Chrome 回归入口：`node experiments/tusk-act4-7/pc/verify.cjs ABS_CHROME NEW_OUTPUT headless`（也可 `visible`）。`PAISLEY_TOOL_ROOT` 可指定独立解压包验证同一流程。Mac 无内容通过不等于 Windows、真实 DoL、Mod、存档、GER 或 Android 通过。自有合成 fixture 位于同目录；真实游戏资源不随包分发。7.0 其余接线和设备工作见源码仓库中的开发计划。
