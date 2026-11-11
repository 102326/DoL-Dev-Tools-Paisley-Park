# 选择和维护工具链

先选能回答当前问题的工具。已有标准能力足够时，优先用它保留统一记录；直接调用官方工具、CDP 或 ADB 更合适时，沿用已有入口，不增加一层包装。

## 按问题选择

| 当前问题 | 优先评估 | 使用边界 |
| --- | --- | --- |
| 看 Android 画面和原生控件 | `android screen`、`android layout`，本项目 Capture / Native Layout | WebView 内容可能不出现在原生布局中；截图和布局都要对应选定设备。 |
| 点击、输入、滚动原生控件 | 当前 CLI 的 `android input` | 先看帮助与真实 accessibility 节点；text/id/class/desc 等原生选择器不是 CSS。多匹配默认拒绝，避免直接选第一个。 |
| 查 WebView 内部 DOM、CSS、Console、网络 | 现有 Inspect / Evidence / CDP | 绑定精确 App、target 和 Document；原生 input 不代替 WebView 文档身份合同。 |
| 查 PID、socket、forward、Logcat 或系统状态 | 现有 ADB 入口 | 明确设备与资源所有权，不重启全局 ADB server 来让检查通过。 |
| 需要实时镜像窗口 | `android device hub --device DEVICE_SERIAL` | 可交互窗口；只在需要人工查看时打开，不把默认自动选设备用于无人值守任务。 |
| 有卡顿、内存或启动问题 | 官方 android-profiler Skill、`android profiler`、已有 Perfetto 工作流 | 先确认问题与采集成本；systemtrace 的 prepare 也可能改变设备/应用状态。读帮助不等于录制成功。 |
| 查固定版本游戏源码 | `source-find` 与项目源码 | 保留固定 revision 和输入来源；不拿另一版本代替缺失的本地游戏。 |
| 有持久业务副作用或需要恢复 | 现有 GER coordinator | 官方 input 的 ACK 不结清 GER Effect，不能用底层工具绕过未决业务动作。 |

较旧 CLI 没有 input/profiler/hub 时，按实际帮助选择已支持的 ADB/CDP 路径；不要仅为一次诊断自动更新环境。官方 Skill 的旧示例与当前 CLI 不一致时，以当前可执行文件的帮助核对语法，同时保留 Skill 的设备、数据和观察规则。

## 先发现能力，再使用

下面只查询帮助，不操作设备。分别记录 CLI 版本和实际读取的官方 Skill 文件身份。

```powershell
android --version
android input --help
android input tap --help
android profiler --help
android device hub --help
android skills list --agent codex
```

本项目 Skill 先运行它自己的 `scripts/resolve.cjs`；官方 Android Skill 使用其实际安装位置。CLI、官方 Skill、本项目 Skill、ADB 与 Android 设备上的 WebView/Perfetto 是不同组件，不能用一个版本号代替其它组件的检查。

## 有更新价值时再更新

只有当前任务包含工具链维护时才运行下面的更新。先保存现有可执行文件、相关 Skill 和版本/摘要，确认安装位置、更新来源与回退办法。CLI 与 Skill 独立更新：

```powershell
android update
android skills update android-cli --agent codex
android skills update android-profiler --agent codex
```

不要使用 `--all` 顺带更新其它 Agent、无关 Skill 或 SDK。优先稳定渠道；例如 SDK 页面出现 Canary，不代表稳定包也已升级。用 `android sdk list --all platform-tools` 查询本机可用的稳定包，只安装本任务需要的包，不下载模拟器或完整 Android 工具链。

ADB 不在 PATH 时，显式设置当前命令进程的 `DOL_ADB`；Python 辅助工具同样支持 `DOL_PYTHON`。不要因此改用户全局 PATH。单项目开发环境可以将 SDK 放在 `tools/android-sdk/`、Python 依赖放在 `.venv/`，这些本机内容不进源码和发布包。

CLI 使用自选 SDK 时，还要在设备命令中传入 `--sdk=SDK_ABSOLUTE_PATH`；通过本项目 Android Inspect / Native Layout 调用 CLI 时可设置已有的 `DOL_ANDROID_SDK`。`DOL_ADB` 只配置本项目的 ADB 调用，不会替官方 CLI 选择 SDK。每次命令进程都要重新带上所需配置。

## 保留兼容性和证据

更新后核对版本、help 和受影响路径。先跑离线合同检查；需要证明真机能力时，另用明确授权设备、App 和数据。帮助查询、模拟夹具、真实 Chrome、真实 Android 分别记录，历史证据不算本轮新实测。

Node 仍要求 26.0.0+，SQLite 随 Node 提供，不单独替换 DLL。XState 按根锁文件安装；除非更新修复了实际使用的能力，否则可以继续保留锁定版本。Playwright 不是本项目生产依赖，已有 ChromeHost/CDP 不需要为版本同步引入它或下载浏览器。

候选验货检查实际导出文件：当前项目 Skill 必须与候选源码对应；SDK、node_modules、.venv、回退副本、原始证据和过程报告不属于 payload。更新安装、候选验证、宿主发现 Skill 和公开发布分别成立，不自动互相证明。
