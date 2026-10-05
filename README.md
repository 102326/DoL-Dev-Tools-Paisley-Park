# DoL Dev Tools 1.0 重置版

面向整个 DoL Mod 开发生态的公共本地开发、调试、诊断与复现实验工具链。Android CLI、Chrome Inspect / CDP 与 ADB 构成 Live Device Access；长期开发闭环是 Observe → Understand → Act → Modify → Deploy → Verify → Preserve Evidence。

当前 1.0 实现诊断与采证基础，尚未交付统一 Action / Journey、CSS Contract 或构建部署编排。完整蓝图与能力状态见 [BLUEPRINT](docs/BLUEPRINT.md)。通用核心不依赖 Soft & Wet、不要求目标 Mod 使用某个 Runtime，也不需要相邻源码仓库。Soft & Wet、MapleBirch、ModHub 和其它项目的 Integration 都是平级可选增强；目前仅附带 Soft & Wet 桥。

1.0.0 在原工具包目录直接更新，保留 Android CLI、CDP evaluator、只读探针和私有备份入口；统一诊断使用 `DoL-Dev.cmd` 或 `node scripts/dol-dev.cjs`。这是版本号重置，Evidence JSON 仍使用 `schemaVersion: 1`。

## 开始使用

必需 Node.js 22.12+；Android 采集需要已有 ADB、USB 调试和明确的设备/App。CDP 采集还需要 App 开启 WebView 调试。无需 `npm install`。

```powershell
New-Item -ItemType Directory -Path artifacts -Force
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
.\DoL-Dev.cmd doctor --out artifacts/doctor.json
adb devices -l
.\DoL-Dev.cmd evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/evidence-001 --scope '#passages'
.\DoL-Dev.cmd support --from artifacts/evidence-001 --out artifacts/support-001
```

请替换设备与包名占位符，并先手动打开目标 App；工具不会自动选择设备或启动游戏。所有输出目标必须尚不存在，父目录须已创建。ADB 不在 PATH 时，将进程内 `DOL_ADB` 指向已有 `adb.exe`；不自动安装或修改全局配置。

## 能力与入口

| 范围 | 命令 / 入口 |
| --- | --- |
| 环境与现场 | `doctor`、`capture`、`evidence` |
| WebView / CDP | Evidence 的 Console、Network、版本和 viewport 摘要；保留 `adb-evaluate.cjs` |
| DOM / Visual | `dom-snapshot`、`dom-diff`、`visual-diff` |
| Android 日志与性能 | `logcat`、`perf`、`record` |
| 明确选择的重型采集 | `perf --deep`、`bugreport`、`evidence --full`，须 `--sensitive yes` |
| 反馈与复现 | `support`、Evidence `--repro`，示例 [repro.example.json](docs/repro.example.json) |
| 可选 Soft & Wet | Evidence `--integration soft-and-wet`，桥接公开 API；缺失或失败独立记录 |
| Agent 诊断流程 | 仓库内 [.agents/skills/dol-dev-tools](.agents/skills/dol-dev-tools/SKILL.md)，五种模式，不全局安装 |

Python、Pillow、Android CLI、scrcpy 与官方 Perfetto recorder 按能力选用，缺失不影响其它入口。`visual-diff` 需要已有 Python + Pillow；`perf --deep` 需要经检查的本地官方 recorder。详细命令及依赖见 [诊断工作流](docs/DIAGNOSTICS.md)。

Evidence 每一步独立记录状态、来源、时间和制品 SHA；请求范围中的失败形成 partial 并保留成功文件。CLI 的 0 表示本次请求完整，1 表示失败或部分完成，不能作为游戏/视觉兼容测试结论。Support 离线投影，不重新连接设备，默认不带截图、DOM、Network、录屏、trace 或 bugreport。

截图、录像和重型资料需要人工隐私检查。Console / Logcat 默认省略正文，Network 不保存 headers、body 或私有路径；摘要不足时明确报告证据限制。数据留在本机，不自动上传。

1.0 的交付与迁移说明见 [重置版说明](docs/RELEASE_1.0.md)，实际验收与已知限制见 [验证记录](docs/VALIDATION.md)。长期规划见 [架构约束](docs/ARCHITECTURE.md)，其中未交付的路线不代表现有能力。

## 可选：DoL Game UI 构建与桌面测试

构建脚本和完整桌面回归已经随 [DoL Game UI](https://github.com/102326/DoL-Game-UI) 公开，继续在该仓库维护，避免两份代码漂移。需要 Node.js 22.12+ 和 Python 3.10+。

```sh
git clone https://github.com/102326/DoL-Game-UI.git
cd DoL-Game-UI
npm ci
npm run test:quick
npm run package
npm run test:release -- --plan
```

完整游戏集成与性能测试需要自行取得游戏资源和 Microsoft Edge；`--plan` 只列计划和缺少的资源。详见该仓库的 [开发文档](https://github.com/102326/DoL-Game-UI/blob/main/docs/DEVELOPMENT.md)。本仓库不自动下载游戏或安装浏览器。

## 独立 Android CLI 采集（保留旧入口）

统一入口的默认 Evidence 使用 ADB 截图和限定范围的 CDP 采证。需要 Android CLI 的自动标注及原始布局时，使用下面保留的独立入口；原始布局不自动进入脱敏 Evidence。

Windows可通过 `winget install --id Google.AndroidCLI --exact --source winget` 安装；其他平台见[官方安装说明](https://developer.android.com/tools/agents/android-cli)。Node.js工具没有新增依赖。默认使用PATH中的`android`，也可指定现有CLI/SDK，不会自动改全局SDK配置。

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

工具0.2.0在Windows/Android CLI 1.0.16486076连接实际手机验证了完整四步采集，PNG1200×2608、非空layout、失败记录与防覆盖通过。未验所有设备、系统对话框、APK增量部署或Journey。真实截图/布局/日志仅本地保存，不上传仓库。

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

## 离线验证

```sh
npm test
python -m unittest discover -s tests -p "test_*.py"
```

Node 测试覆盖统一采集器、传输、失败隔离、脱敏、投影与旧入口；Python 测试覆盖私有备份和可选视觉比较。测试不连接真实设备，系统 Python 缺 Pillow 时视觉项明确跳过。真机与交付包检查见 [验证记录](docs/VALIDATION.md)。

保留的 evaluator 会执行调用者指定的 JavaScript；只运行自己检查过的探针。Backup 处理真实私有数据，始终独立于 Evidence / Support，不默认执行。DoLWorkbench、Mod Center 和 Soft & Wet Runtime 不属于工具包本体。

MIT 许可只适用于本仓库工具源码，不涵盖游戏、加载器或其他模组。不要提交真实存档、日志、截图、凭据、第三方资源或 APK。
