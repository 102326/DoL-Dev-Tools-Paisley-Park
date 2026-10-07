# DoL Dev Tools: Paisley Park — 诊断工作流

当前 3.0.2 Gold Experience Requiem 提供通用诊断/Schema 1 与独立私有的[Gameplay Runtime](GAMEPLAY.md)，验收与限制见[收口](CLOSEOUT_3_0_2.md)。通用核心不要求 Soft & Wet 或 Gameplay 依赖；Integration 为可选增强，业务 Scene/Memory 不自动进入 Evidence/Support。旧阶段文档保留为验证历史；3.0.0/3.0.1 公开 Release/tag 已按用户要求移除。
历史首批说明见 [0.3.0](FIRST_BATCH.md)，长期约束见 [架构](ARCHITECTURE.md)。本文描述当前入口。

仓库Skill可通过`install-skill --out NEW_DIRECTORY_NAMED_dol-dev-tools-paisley-park`独立安装；已有安装不覆盖，位置解析器指向同一份Tools。见[安装与搬迁](SKILL_INSTALL.md)。

## 快速入口

```powershell
node scripts/dol-dev.cjs --version
node scripts/dol-dev.cjs --help
node scripts/dol-dev.cjs doctor --out artifacts/doctor.json
node scripts/dol-dev.cjs doctor --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/doctor-app.json
node scripts/dol-dev.cjs capture --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/screen-001
node scripts/dol-dev.cjs perf --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/perf-001
node scripts/dol-dev.cjs logcat --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/log-001 --seconds 30
node scripts/dol-dev.cjs record --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/video-001 --seconds 5
```

Windows 可用 `Paisley-Park.cmd` 替换 `node scripts/dol-dev.cjs`。先创建输出父目录；目标目录或 JSON 文件必须不存在。
Node.js 22.12+ 为必需。ADB 不在 PATH 时设 `DOL_ADB`，其值是已有 adb 可执行文件；不自动安装或修改系统 PATH。
Doctor的ADB `unavailable / ENOENT`优先检查已有SDK/platform-tools位置；仅当前进程设`$env:DOL_ADB = 'PATH_TO_EXISTING_PLATFORM_TOOLS/adb.exe'`，用`& $env:DOL_ADB version`核对后重新采集到新输出，不覆盖初次partial。不要把可选scrcpy缺失当作ADB缺失。
其他可选工具环境变量为 `DOL_ANDROID_CLI / DOL_PYTHON / DOL_SCRCPY`。所有设备命令绑定显式 serial 和 package，不猜目标。
Doctor 检查可选工具缺失不阻断必需环境；没有设备或显式设备不匹配会标记 partial，不自动选另一台设备。
Doctor 只查询工具版本、设备、App、socket、run-as 可用性、已有转发、Perfetto 与输出目录权限；run-as 只执行 id，不读取私有数据。不创建转发、不修环境、不安装辅助 APK。
Doctor的`complete`只表示其必需检查满足；App进程与WebView socket检查可能仍不可用。进入CDP前分别核对这些检查，不能仅凭不可用推断崩溃或调试被关闭。是否恢复运行现场由本轮Done决定，纯源码任务不为补覆盖而启动App。
默认CDP选择恰好一个标题为`Degrees of Lewdity`的page；可用`--target-id`明确选择inspect确认的page，不自动猜目标。转发绑定已验证主PID的标准/browser WebView socket；多个候选需显式`--webview-socket`，未知命名保留不支持，详见下方目标选择。
需要现有 CDP 转发时可给 Doctor `--endpoint http://127.0.0.1:PORT`；独立端点的 App 关联标为未验证，不自动创建转发来让检测通过。
scrcpy 只检测，不启动；人工需要时自行选择设备运行 scrcpy，并用 Chrome 的 `chrome://inspect/#devices` 调查。工具不替代 DevTools。

capture / perf / logcat / record 复用同一 Manifest 和失败策略，但只请求相关采集，不顺带运行整个 Evidence。
它们不启动或重启 App、不点按、不安装游戏、不访问存档；App 已安装但未运行时信息如实记录，不自动启动。
Screenshot / Record 是当前屏幕，可能包含系统栏、用户资料或其他 App；`complete` 不保证它是目标页面。分享前检查隐私。

## 常规 Evidence、复现说明与 Support

CLI会区分采集状态与内容覆盖：DOM截断在manifest步骤coverage与dom-contract.json中显示，已判定的原因见truncationReasons。Console的captureStart/End是主机接收窗口，Runtime.enable可能回放缓存事件；timestampMs是目标事件时间，两端时钟可能不同。events保留最多200条，omitted/truncated表示遗漏，不是“窗口内新增错误数”。游戏版本来自CDP GameVersion查询，包装App版本来自ADB package versionName；前者unknown时不以后者替代。

```powershell
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-001 --scope '#passages' --logcat-seconds 30
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-002 --scope '#customOverlay' --integration soft-and-wet --record-seconds 5 --repro repro.json
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-external --scope '#passages' --integration-file integrations/examples/dom-summary.cjs
node scripts/dol-dev.cjs support --from artifacts/evidence-001 --out artifacts/support-001
node scripts/dol-dev.cjs support --from artifacts/evidence-001 --out artifacts/support-with-image --include-screenshot yes
```

复现文件是用户明确选择的 JSON，字段 summary / expected / actual / note 为文本，steps 为最多 20 条文本数组，每段最多保留 256 字符。示例：

```json
{"summary":"目标页面布局变化","expected":"工具栏在卡片上方","actual":"工具栏位置不同","steps":["手动打开目标页面"],"note":"人工复现说明，提交前检查隐私"}
```

复现说明在任何采集开始前校验，过大或字段类型错误直接拒绝；它不会指示工具执行其中的步骤。
路径、常见凭据经过处理，但自由文本可能仍有个人信息，明确标记人工复核。不要填入存档正文、角色数据、账号或私有 URL。

Evidence 默认仍是常规范围；logcat 与 recording 只在显式请求时加入。Soft & Wet 缺失或未知 API 不使 Generic 失败。
没有 DOM scope 时不全页扫描；指定 scope 必须命中唯一节点。JSON 携带 schemaVersion / incidentId / source / timestamp；二进制通过 manifest 关联并计算 SHA。
每一步记录 completed / failed / skipped / unsupported，部分失败保留成功制品。需要的步骤缺项为 partial，CLI 返回非零；这不是游戏测试失败判定。
时钟只做近似对齐，设备秒级日期可能有通信误差。各源顺序采样，不把会话身份当作同时采样证明。

Support 从已有 Evidence 投影，保持原 incidentId，另加 supportId；不重新连接设备。
默认只投影版本、Android 版本、Console 类型摘要、Logcat 数量、简化兼容状态、失败步骤和用户复现说明。省略设备型号、serial、package、DOM、Network、性能原始数据和所有原始日志。
默认不复制截图、录屏、trace 或 bugreport；截图必须明确选择。其他二进制不会因为 `--include-screenshot` 被带入。
每个被投影制品必须与 manifest SHA 和 incidentId 匹配，缺失或不一致标为 partial，不把错误文件当作同一次现场。
Support 也需要分享前人工检查，不自动上传 Issue。

## 日志、性能与录屏限制

Logcat 只读取已验证 App PID 的最后最多 300 条，按设备 epoch 过滤最近 1..300 秒；不清日志、不读默认全系统日志。
默认保留 timestamp、level、固定 tag 类别与数量，省略正文和自定义 tag。缓冲分隔行与前导空白兼容；其他未识别格式明确失败。
因此默认元信息可以发现错误时段和类别，但不能替代原文用于定位具体异常。窗口有 1 秒粒度，达到尾部上限会标记可能截断。
Console 也省略正文，异常可保留内置异常类型、行列和 script URL 散列；Network 只留经处理摘要，不保存请求 / 响应正文、headers 或私有 URL。

gfxinfo/meminfo 不 reset，不做泄漏诊断。非零 Flags 的帧样本首版不推断其语义，报告排除数量；没有可解析时长样本时 median / p95 为 null，不伪造零。
App汇总帧数属于累计Android指标，不代表当前复现区间或整个游戏速度。`process-memory`可补准确packageList关联进程，但不能证明某个page的renderer归属。

Recording 限 1..30 秒、4 Mbps，先创建独立 `/data/local/tmp/dol-dev-UUID` 目录，输出后只清理自己创建的文件和空目录。
设备文件清理失败会报告警告并使包为 partial；不执行递归删除，也不触碰第三方文件。
容器头检查不等于完整解码或播放验收，需外部播放器或 ffprobe 查看。主机默认保留本地 MP4，不自动上传。

## DOM 与视觉比较

DOM Snapshot / Diff：

```powershell
node scripts/dol-dev.cjs dom-snapshot --endpoint http://127.0.0.1:PORT --scope '#passages' --out artifacts/dom-001.json
node scripts/dol-dev.cjs dom-diff --before artifacts/dom-001.json --after artifacts/dom-002.json --out artifacts/dom-diff.json
```

独立 endpoint 的 App 关联未验证；调用者先核对对应 socket / 页面。基础只描述结构与 data 属性名，不读取 HTML、正文、input 值或 data 值；范围与截断明确记录。
Diff 使用结构地址，插入节点可能导致地址移动，不能证明节点身份或自动决定兼容失败。
兼容契约先区分原生、第三方和UI自有节点及明确允许的例外；由目标项目定义identity、handler、父子/兄弟关系的稳定要求。UI自有组件重建或约定的有限移动不自动构成失败。精确对象/事件断言留在项目测试或审阅后的直接探针中，不扩大通用Snapshot字段。

```powershell
node scripts/dol-dev.cjs visual-diff --golden golden.png --current current.png --out artifacts/visual-001 --tolerance 8
```

Visual Diff 是可选 Python + Pillow 能力。`DOL_PYTHON` 可指向已有环境；缺依赖明确报错，其他命令不受影响，不自动安装。
图片必须同尺寸；不隐式缩放，最多 800 万像素、单文件 64 MiB。RGBA 合成在白底后比较 RGB，输出 golden/current/diff PNG 与统计，清除输入图的嵌入元数据。
tolerance 为 0..255，任一 RGB 通道差值超过它才计为变化像素。报告 changedPixels / ratio / meanMaxChannelDifference，不输出通过/失败的视觉结论。
工具不会验证页面、字体、背景、平台、viewport、游戏状态或 Visual Tier 一致；调用者应记录并核对这些比较条件。不要自动替换 Golden 或将像素差作为发布门槛。

## 重型入口：显式选择敏感采集

```powershell
node scripts/dol-dev.cjs perf --deep --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/trace-001 --seconds 10 --sensitive yes
node scripts/dol-dev.cjs bugreport --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/bug-001 --sensitive yes
node scripts/dol-dev.cjs evidence --full --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/full-001 --scope '#passages' --sensitive yes
```

这些内容不能通过普通结构化 redaction 变成适合公开分享的文件；必须显式 `--sensitive yes`，否则采集前拒绝，不作为常规 smoke。
Full 在常规范围上加入默认 10 秒 recording、30 秒 Logcat、10 秒 Perfetto 和 bugreport。它们顺序执行，各自失败不删除其他成功制品。
Support 永远不投影 trace / bugreport；数据仅本地，不提供上传、查看器或原文自动解析。

Perfetto 包装已有的官方 `record_android_trace`，通过 `DOL_PERFETTO_RECORDER` 指定经过检查的本地脚本，`DOL_PYTHON` 指定 Python。
不自动下载；缺 recorder 为 unsupported。预检 Android API >=29 和系统 Perfetto，避免官方 helper 在旧平台自动 sideload；不传 root / sideload / no-guardrails。
固定参数为显式 serial、`--user`禁止helper尝试root、1..30 秒、32 MB buffer、目标 App 和 sched/gfx/wm，`--no-open` 禁止自动打开或提供 viewer。
保留 helper SHA、采集参数和 trace 的 SHA / 字节数；文件非空不代表 trace schema 或内容正确，尚未接入 trace processor。
helper 运行超时为采集时长 +30 秒；系统 trace 本身可能包含设备线程与其他进程信息，须人工检查隐私。
已有选定真机3秒trace与完整bugreport验收；前者另行复用android-profiler的官方Trace Processor确认schema、约2.9785秒跨度和目标进程调度数据，后者用标准库验证ZIP CRC/main entry。核心仍不内置解析器，traceParsed=false与外部验证收据分开。Support不复制两种二进制，见[最终验收](FINAL_ACCEPTANCE.md)。
官方参数核对来源：[record_android_trace](https://github.com/google/perfetto/blob/main/tools/record_android_trace)。不同本地脚本版本须核对参数，不把该链接当作已安装版本证明。

bugreport 使用固定设备的 ADB 本地输出，主机调用上限 180 秒、接受文件大小上限 512 MiB，ZIP 头检查不等于 archive 完整性检查。
命令超时并不保证 Android dumpstate 已停止，系统可能保留副本；工具不清理系统 bugreports 或其他数据。
成功或失败产生的局部文件都保留；失败时标记失败，不能用非空文件冒充完整捕获。
内容范围见 [Android 官方 bugreport 说明](https://developer.android.com/studio/debug/bug-report)：可能含全系统日志、stack、服务状态与文件内容，不只是目标 App。

## Skill 与当前边界

仓库内 [.agents/skills/dol-dev-tools-paisley-park/SKILL.md](../.agents/skills/dol-dev-tools-paisley-park/SKILL.md) 路由诊断、复现和开发闭环，支持[独立安装](SKILL_INSTALL.md)。本机已有安装及独立任务使用证明，自动发现仍取决于宿主和实际请求。
Skill 面向整个 DoL Mod 生态，路由实际工具，不复制实现。Live Site First、证据先行、来源分离、最小充分诊断；测试环境允许任务范围内的主动复现，具体操作边界见 [架构](ARCHITECTURE.md)。
1.2提供独立有限Action/Journey，不自动遍历控件或抓取网络正文。保留Android CLI独立入口，原始布局不直接进入脱敏包；helper运行/安装需明确选择。
独立Action/Journey可以在明确测试环境执行点击、输入、导航、重启、旋转和普通游戏复现；Inspect/Doctor/Evidence保持观察语义。真实存档、正式用户数据和凭据的破坏性操作需对应显式授权。范围见[BLUEPRINT](BLUEPRINT.md)。诊断层无常驻后台服务或云端遥测；Gameplay 使用独立的本地 SQLite Store。

## 公共格式与第三方 Integration

1.1 的 `--integration-file` 显式执行一个已审阅的本地 `.cjs`；相对路径按调用目录解析，可与内置 Soft & Wet 选项组合。没有 CDP 时直接跳过，模块缺失/不支持/失败不影响 Generic 完整性。10 秒 Worker 总时限并非安全沙箱或远端副作用回滚。完整限制、作者隐私责任与独立 DOM 示例见 [Contract 1](INTEGRATIONS.md)。

现有 Evidence / DOM / Support 的公共结构见 [FORMATS](FORMATS.md) 与 [JSON Schema](../schemas/diagnostics-v1.schema.json)。Support 不复制第三方自定义诊断正文；截图仍需单独选择。

## 开发工作区：CSS / Environment / 目标选择

下面是1.2的增补入口，现场证明与条件边界见[能力覆盖](CAPABILITY_COVERAGE.md)。

```powershell
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/facts-001 --scope '#passages' --css yes --environment yes
node scripts/dol-dev.cjs environment --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/environment-001
node scripts/dol-dev.cjs inspect --endpoint http://127.0.0.1:PORT --out artifacts/targets.json
node scripts/dol-dev.cjs css-snapshot --endpoint http://127.0.0.1:PORT --scope '#passages' --out artifacts/css.json
node scripts/dol-dev.cjs css-diff --before BEFORE_JSON --after AFTER_JSON --out artifacts/css-diff.json
node scripts/dol-dev.cjs environment-diff --before BEFORE_JSON --after AFTER_JSON --out artifacts/environment-diff.json
```

CSS 最多 200 节点/深度8，只读样式白名单与矩形，URL 值整体省略，长值/节点截断如实标记；结构地址不是稳定节点身份。Environment 使用公开 loader 元信息，最多300项；reportedIndex 是报告顺序，enabled/loadOrder 未知时为 null，不能当作全部导入/禁用库存或实际执行顺序。

默认 CDP 仍要求唯一标准 DoL 标题；可用 inspect 的 ID 通过 --target-id 显式选择 page，缺失/歧义不自动回退到另一页。ADB 转发支持当前唯一 PID 的标准/browser WebView socket；多候选时须 --webview-socket 指定当前 PID 的已核对名称。独立 endpoint 入口不自动证明 App 关联。

Action/Journey 当前开发入口与边界见 [ACTIONS](ACTIONS.md)。Inspect/Doctor/Evidence 仍保持观察语义，操作属于独立命令。

`journey-record`记录短时WebView trusted元信息并输出待审阅候选；`matrix`按明确设备/App执行有限Journey用例；`network-scenario`用于声明中性网络原状态且无竞争设置客户端的测试目标；`animation-frames`离线使用已有ffmpeg/ffprobe。用法及证明范围见[ACTIONS](ACTIONS.md)、[NETWORK](NETWORK.md)、[ANIMATION](ANIMATION.md)。

`viewport-matrix` 用声明无原 override 的测试 page 做有限宽度采集，见 [VIEWPORT](VIEWPORT.md)；`native-layout`/`evidence --layout yes` 显式选择现有 Android CLI helper，见 [NATIVE_LAYOUT](NATIVE_LAYOUT.md)。`leak-probe` 的数值与可选 detached 能力、清理未知的限制见 [PERFORMANCE](PERFORMANCE.md)。`evidence-timeline` 离线对齐有有效时钟锚的证据，不隐藏源端截断、缺失锚或无法投影的时间源，见 [EVIDENCE_TOOLS](EVIDENCE_TOOLS.md)。

`process-memory`/`evidence --processes yes` 使用 Android 公开 packageList 关联与逐PID内存，不猜 JS renderer，见 [PROCESS_MEMORY](PROCESS_MEMORY.md)。`hitbox-overlay` 把新的 Hitboxes JSON 投影为无正文 SVG，见 [INSPECTORS](INSPECTORS.md)。目标项目自身 Build→Deploy→Verify 流程和独立可运行夹具见 [WORKSHOP](WORKSHOP.md)。

1.2发布后开发源码提供 `app-lifecycle`、`app-lifecycle-diff`、`evidence --lifecycle yes` 和 Journey 原生checkpoint；仅采当前user/UID绑定的系统退出元信息，见 [APP_LIFECYCLE](APP_LIFECYCLE.md)。观察与重启动作分开，不访问Mod内部对象、栈正文或存档。

## 独立 Android CLI 与兼容入口

统一入口的默认 Evidence 使用 ADB 截图和限定范围的 CDP 采证。需要 Android CLI 的自动标注及原始布局时，使用下面保留的独立入口；原始布局不自动进入脱敏 Evidence。

Windows可通过 `winget install --id Google.AndroidCLI --exact --source winget` 安装；其他平台见[官方安装说明](https://developer.android.com/tools/agents/android-cli)。这个独立 Node.js 采集入口不需要 npm 依赖。默认使用PATH中的`android`，也可指定现有CLI/SDK，不会自动改全局SDK配置。

```powershell
$env:DOL_ANDROID_CLI = "$env:LOCALAPPDATA/Microsoft/WinGet/Packages/Google.AndroidCLI_Microsoft.Winget.Source_8wekyb3d8bbwe/android.exe"
$env:DOL_ANDROID_SDK = 'PATH_TO_EXISTING_SDK'
New-Item -ItemType Directory -Path artifacts -Force
node scripts/android-inspect.cjs DEVICE_SERIAL artifacts/session-001
```

Windows也可执行 `Inspect-Android.cmd DEVICE_SERIAL artifacts/session-001`；双击无参数只显示用法，不自动选择设备。目标目录必须尚不存在，父目录需先创建。输出原图、标注图、完整布局JSON及命令状态/耗时报告；失败时保留已采资料，不覆盖旧报告，不偷偷重试或换设备。所有CLI调用加`--no-metrics`，单命令超时30秒。`complete=true`只说明制品结构可读取，不能证明屏幕已解锁、画面正确或测试通过；必须查看截图与目标控件。

`layout`首次可能安装Google独立的`com.android.cli.interact.instrumentation`辅助APK。需用户允许USB安装，它不替换游戏。若手机拒绝，报告失败并使用已有ADB/CDP回退，不关闭系统保护或反复安装。采集器不点按、不启动/重启应用、不安装游戏APK、不操作存档。

标注编号可交给官方`screen resolve`生成坐标（本命令不点击）：

```powershell
& $env:DOL_ANDROID_CLI --no-metrics screen resolve --screenshot=artifacts/session-001/annotated.png '--string=input tap #N'
```

视觉分块不等于业务控件语义，执行前核对实时画面。不能以布局JSON替代DOM、游戏变量、原节点身份或性能证明。采集失败时可用`adb -s DEVICE_SERIAL exec-out screencap -p`获取截图（用二进制安全的文件写入方式）；网页检查继续走下面的CDP入口。

早期 Android CLI 采集证明见 [历史索引](HISTORY.md#早期入口与相邻项目)。真实截图/布局/日志仅本地保存，不上传仓库。

## ADB/CDP 回退与精确检查

安装 Android SDK Platform Tools，使 `adb` 可用；开启设备 USB 调试。应用必须支持 WebView 调试。以下命令中的 `DEVICE_SERIAL` 和 `SOCKET_NAME` 必须替换为实际值。

```sh
adb devices
adb -s DEVICE_SERIAL shell cat /proc/net/unix
adb -s DEVICE_SERIAL forward tcp:50806 localabstract:SOCKET_NAME
node scripts/adb-evaluate.cjs probes/status.js
node scripts/adb-evaluate.cjs probes/wardrobe.js artifacts/wardrobe.json
```

从 `/proc/net/unix` 查找对应应用的 `webview_devtools_remote` socket，去掉开头的 `@`；不要使用另一应用的 socket。应用重启后需重新核对。先创建 `artifacts` 目录；输出文件已存在时不会覆盖。

端口可通过环境变量 `DOL_CDP_URL` 调整。PowerShell 示例：

```powershell
$env:DOL_CDP_URL = 'http://127.0.0.1:50806'
node scripts/adb-evaluate.cjs probes/shop.js
```

附带探针只读取版本、页面和布局统计，不购买、换装、加载存档或推进剧情。执行器本身会执行你指定的任意 JavaScript，因此只运行检查过的脚本。接口不存在时返回空值，不代表该版本已验证兼容。

## 私有应用数据备份

先在游戏里保存并退出应用，避免文件在读取期间发生变化；本工具不停止应用，不操作存档槽，不恢复数据。

```sh
python scripts/adb-backup-app-data.py --serial DEVICE_SERIAL --label before-test
```

ADB 不在 PATH 时使用 `--adb` 指定路径；其他包名使用 `--package`。需要应用允许 `run-as`，不支持时明确失败，不尝试 root 或绕过限制。输出默认在已忽略的 `backups/` 中，包含真实私有数据，不要上传。TAR 可读性及 SHA256 检查不等于恢复验收。

Backup 始终独立于 Evidence / Support，不默认执行。DoLWorkbench、Mod Center 和 Soft & Wet Runtime 不属于工具包本体。
