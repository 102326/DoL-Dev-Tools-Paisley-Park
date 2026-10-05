# 增强工具包 0.3.0：首批实现

状态：本地开发版本，未发布。离线检查与真机验收分别记录，不把规划中的所有能力列为已实现。

## 命令

需要 Node.js 22.12+、ADB，以及已经打开且允许 WebView 调试的目标 App。
命令不启动 App、部署 APK、修改游戏或读取存档。输出目录的父目录必须存在；目标目录 / 文件必须尚不存在。

```powershell
New-Item -ItemType Directory -Path artifacts -Force
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/incident-001 --scope '#customOverlay'
```

Windows 可将 `node scripts/dol-dev.cjs` 换成 `DoL-Dev.cmd`。
ADB 不在 PATH 时指定 `DOL_ADB`。不能省略 serial 或 package，也不会自动换设备。
指定 scope 后，必须恰好命中一个元素；不存在或歧义记录采集失败，其他制品仍保留。不指定 scope 则 DOM 明确跳过，不扫描全页。

Evidence 根据指定 package 的唯一运行进程，核对对应的 `webview_devtools_remote_PID` socket，再建立独立 `tcp:0` 转发。结束时关闭连接、移除本次转发，不使用或删除已有端口映射。
进程变化、socket 不可识别、CDP 目标不是唯一的 `Degrees of Lewdity` 页面时拒绝猜测。当前不支持其他 socket 命名、多个 App 进程或其它页面标题；它们是明确的支持限制。

可选集成：

```powershell
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/incident-002 --scope '#customOverlay' --window-ms 3000 --integration soft-and-wet
```

默认不启用任何 Integration。Soft & Wet 缺失记为 skipped，未知 API / schema 记为 unsupported，接口异常记为 failed；这些不改变 Generic 必需步骤的完成结论。
Soft & Wet 桥只使用公开 UI API，不打开 Inspector、不调用 rescan、不注册 Adapter，也不读取内部 store。
记录适配命中、降级原因、角色与 fallback 节点数、浮层类别及事件数量；默认省略自定义 ID、selector 字符串和事件正文。
只有能力查询但没有诊断 API 时如实记录 `runtimeSnapshotAvailable / adapterProbeAvailable` 为 false，不伪造完整诊断。

独立 DOM 命令用于已经人工确认的本地 CDP 转发端点：

```powershell
node scripts/dol-dev.cjs dom-snapshot --endpoint http://127.0.0.1:50806 --scope '#customOverlay' --out artifacts/dom-before.json
node scripts/dol-dev.cjs dom-snapshot --endpoint http://127.0.0.1:50806 --scope '#customOverlay' --out artifacts/dom-after.json
node scripts/dol-dev.cjs dom-diff --before artifacts/dom-before.json --after artifacts/dom-after.json --out artifacts/dom-diff.json
```

独立快照明确标注端点与 App 的关联未由工具验证。Diff 也接受 Evidence 中的 `dom-contract.json`；两个有 scopeHash 的契约范围必须相同。
DOM 基础字段为 tag / id / class、data 属性名、显式 hidden、parent、childCount 和结构地址。首版不采集 data 值、正文、控件值或完整 HTML。
最多 500 个节点、8 层，每个节点限制 class / data 数量，截断会标记。基础不依赖 Soft & Wet 字段。
Diff 按结构地址比较；插入节点可能导致后续地址移位，因此变化不证明节点身份、根因或兼容失败。首版能报告 data 属性名变化，不能报告被省略的属性值变化。

## 证据格式与状态

每包有 UUID incidentId、schemaVersion 1 和 manifest.json。JSON 制品携带相同身份、来源与时间；PNG 通过 manifest 关联，并记录 SHA256。
各步骤包含 required、状态、耗时、采集起止、制品摘要和原因。manifest 在步骤之间更新，保留已成功制品；终止进程可能留下尚未最终归类的 manifest，不能把初始 failed 当作完成状态。

默认请求 device、app、screenshot、gfxinfo、meminfo、CDP transport、Console、Network、WebView 和版本元信息；指定 scope 时 DOM 为必需步骤。
必需步骤全部完成为 complete；有可用证据但必需步骤缺项为 partial；没有可用现场证据为 failed。可选集成单独记录状态。
命令 partial / failed 返回非零退出码，但不会删除证据目录。
版本字段为 null 表示当前来源无法提供，不是版本检测通过；完整性不等于游戏业务、画面正确或版本兼容验收。

设备 serial 不输出；设备报告记录型号、Android 版本及采样的设备时间。时钟偏差为近似值，包含秒级粒度与通信耗时的不确定性。
App 报告包含安装版本、是否唯一运行进程、当前 foreground 是否对应目标。截图是当前屏幕，不保证它就是目标 App。
各来源顺序采集；同一个 incidentId 不意味着它们在同一瞬间采样。

ADB 与每次 CDP 请求超时 10 秒；collector 包含有限次数命令，单次整个流程可能超过 10 秒。事件窗口默认为 1 秒，允许 0..10000 毫秒，没有无限采集或重试。
Console / Network 各保留最多 200 条摘要，注明省略数量。仅覆盖该连接接收到的事件，不恢复连接前的 Console 或请求历史；自动 enable 时收到的缓冲事件也可能早于采样起点。
Console 只记录类型、时间和参数数量，完全省略消息 / 参数正文 / stack。
Network 只记录方法、资源类型、状态、耗时、失败标志、时间；hostname 使用散列，URL path / query / fragment、凭据、headers、request / response body 均不保存。散列不是匿名保证，可被字典比对。

gfxinfo / framestats 解析 Android 汇总帧数、jank 及可用的时长样本 median / p95，最多分析 10000 行帧数据。不 reset 计数，不修改屏幕。
meminfo 只输出可解析的 TOTAL PSS / TOTAL RSS；不支持格式明确失败，不把无数据变成零。
这些是 Android 报告，不等于完整游戏加速、Chromium 独占耗时或内存泄漏证明；首版没有枚举 WebView 子进程。

结构化采集使用字段筛选，Evidence 聚合再次过滤常见凭据和私有路径；失败不写原始工具 stderr 或异常正文。id / class 等结构元数据仍可能包含应用自定义内容，分享前应检查。
截图含实际屏幕内容，必须人工检查隐私；本版本不宣称证据包可无条件公开分享。
所有数据仅本地保存；不自动上传或包含 Backup 私有应用数据。

## 当前范围与下一批

保留原 `android-inspect.cjs`、`adb-evaluate.cjs` 和 Backup 命令。CDP 连接与请求逻辑提取成共享实现，旧 evaluator 的行为验证继续保留。
新 Evidence 首版采用 ADB PNG 截图，尚未聚合 Android CLI layout / annotated：原 layout 含正文和原始输出，且可能安装辅助 APK，需后续单独增加脱敏与显式选择。
暂未实现 Doctor、独立 perf CLI、Logcat、录屏、Perfetto、bugreport、Visual Diff、Support Bundle、repro 输入和可安装 Skill。没有用空壳命令宣称支持。
下一批先按实际现场需求补充，不为体系完整添加后台服务、数据库或插件框架。

## 验证

```powershell
npm test
python -m unittest discover -s tests -p "test_*.py"
node scripts/dol-dev.cjs --help
git diff --check
```

离线回归验证传输、输出保护、部分失败、可选集成隔离、采集内容限制、DOM 比较和性能解析。测试不会连接设备。
2026-10-05 本地执行：`npm test` 11 项通过；Python Backup 回归 2 项通过；CLI help、上述新入口与模块的 Node 语法检查、`git diff --check` 通过。
实际 CLI 另以不存在的 ADB 路径离线执行一次 Evidence：预期退出码 1，保留 failed manifest，设备步骤记录 ENOENT；未连接设备。
本轮真机、具体 Android / WebView 版本、视觉画面、现场 Console / Network、帧指标准确性仍待用户选定设备和页面后的独立采集验收。
