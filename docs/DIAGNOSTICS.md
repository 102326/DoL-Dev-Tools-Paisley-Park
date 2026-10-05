# DoL Dev Tools 1.0：诊断工作流

1.0 重置版。通用核心不要求 Soft & Wet；独立 Integration 只读其公开诊断。
历史首批说明见 [0.3.0](FIRST_BATCH.md)，长期约束见 [架构](ARCHITECTURE.md)。本文描述当前入口。

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

Windows 可用 `DoL-Dev.cmd` 替换 `node scripts/dol-dev.cjs`。先创建输出父目录；目标目录或 JSON 文件必须不存在。
Node.js 22.12+ 为必需。ADB 不在 PATH 时设 `DOL_ADB`，其值是已有 adb 可执行文件；不自动安装或修改系统 PATH。
其他可选工具环境变量为 `DOL_ANDROID_CLI / DOL_PYTHON / DOL_SCRCPY`。所有设备命令绑定显式 serial 和 package，不猜目标。
Doctor 检查可选工具缺失不阻断必需环境；没有设备或显式设备不匹配会标记 partial，不自动选另一台设备。
Doctor 只查询工具版本、设备、App、socket、run-as 可用性、已有转发、Perfetto 与输出目录权限；run-as 只执行 id，不读取私有数据。不创建转发、不修环境、不安装辅助 APK。
当前 CDP 选择恰好一个标题为 `Degrees of Lewdity` 的 page；不同标题或多个匹配页明确失败，不猜目标。自动转发只支持已验证主进程的 `webview_devtools_remote_PID` socket；其它命名需人工调查。
需要现有 CDP 转发时可给 Doctor `--endpoint http://127.0.0.1:PORT`；独立端点的 App 关联标为未验证，不自动创建转发来让检测通过。
scrcpy 只检测，不启动；人工需要时自行选择设备运行 scrcpy，并用 Chrome 的 `chrome://inspect/#devices` 调查。工具不替代 DevTools。

capture / perf / logcat / record 复用同一 Manifest 和失败策略，但只请求相关采集，不顺带运行整个 Evidence。
它们不启动或重启 App、不点按、不安装游戏、不访问存档；App 已安装但未运行时信息如实记录，不自动启动。
Screenshot / Record 是当前屏幕，可能包含系统栏、用户资料或其他 App；`complete` 不保证它是目标页面。分享前检查隐私。

## 常规 Evidence、复现说明与 Support

```powershell
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-001 --scope '#passages' --logcat-seconds 30
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-002 --scope '#customOverlay' --integration soft-and-wet --record-seconds 5 --repro repro.json
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
App 汇总帧数属于累计 Android 指标；不代表当前复现区间或整个游戏速度。WebView 子进程尚未单独枚举。

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
固定参数为显式 serial、1..30 秒、32 MB buffer、目标 App 和 sched/gfx/wm，`--no-open` 禁止自动打开或提供 viewer。
保留 helper SHA、采集参数和 trace 的 SHA / 字节数；文件非空不代表 trace schema 或内容正确，尚未接入 trace processor。
helper 运行超时为采集时长 +30 秒；系统 trace 本身可能包含设备线程与其他进程信息，须人工检查隐私。
官方参数核对来源：[record_android_trace](https://github.com/google/perfetto/blob/main/tools/record_android_trace)。不同本地脚本版本须核对参数，不把该链接当作已安装版本证明。

bugreport 使用固定设备的 ADB 本地输出，主机调用上限 180 秒、接受文件大小上限 512 MiB，ZIP 头检查不等于 archive 完整性检查。
命令超时并不保证 Android dumpstate 已停止，系统可能保留副本；工具不清理系统 bugreports 或其他数据。
成功或失败产生的局部文件都保留；失败时标记失败，不能用非空文件冒充完整捕获。
内容范围见 [Android 官方 bugreport 说明](https://developer.android.com/studio/debug/bug-report)：可能含全系统日志、stack、服务状态与文件内容，不只是目标 App。

## Skill 与当前边界

仓库内 [.agents/skills/dol-dev-tools/SKILL.md](../.agents/skills/dol-dev-tools/SKILL.md) 提供五种诊断模式和升级条件；未安装到全局，不宣称本会话已经自动发现它。
Skill 只路由实际命令，不复制 Tools。默认观察、证据先行、来源分离、最小充分验证；重型动作必须有具体未解决问题。
当前未提供原生 action / journey、自动遍历控件、先进网络正文抓取、Helper APK 自动安装或全局 DOM 镜像。保留已有 Android CLI 独立采集入口，不将其原始布局直接塞进脱敏包。
这些选择保持初始任务的游戏动作/存档禁区，不为了完整体系新增自动化框架、后台服务、数据库或云端遥测。
