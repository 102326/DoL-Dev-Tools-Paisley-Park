# Android CLI 1.1.16919734 接续记录

日期：2026-11-13。基于 `ecf12d952434696b1be84f9f3c41500d71470479`，在既有 `maintenance/toolchain-refresh-7.1` 分支完成。此次只更新本机官方工具及本交接记录，不改变 RC.2 的版本、源码功能或候选内容。

## 实际更新

- 官方 `android update` 检出并安装 `1.1.16919734`，替换原 `1.1.16717390`，退出码 0；未出现新的条款、提权或确认要求。更新前已保存命令入口和两份官方 Skill 的副本；更新器保留的旧实现也另存于本次证据目录，未删除原文件。
- 更新器同时更新了 Codex 的官方 `android-cli` Skill。主文件由 861 行变为 680 行：补充制品分析、Compose preview 的描述，更新 profiler 帮助摘要并删减重复的通用帮助。制品分析和 preview 已出现在旧 CLI 的顶层帮助中，不能把这次文档补充说成新增能力。
- 另用 `android skills update android-profiler --agent codex` 核对官方版本，退出码 0；该目录所有文件摘要均未变化。三个被核对的 Skill 目录中，唯一发生内容变化的是 `android-cli/SKILL.md`。
- ADB 保持 `37.0.1-15733141`，Node 保持 `26.13.0`，npm 保持 `11.20.0`。未改 SDK、运行依赖、GER 或 Gold Experience 全局 Skill。

Windows 的 Winget `android.exe` 是启动入口，更新前后摘要相同；实际更新的是 Android 用户目录下的 `bin/android-cli.exe`，更新器同时保留 `android-cli.exe.old`。入口摘要不能代表 CLI 实现版本，交接应使用实际版本输出及实现文件摘要。

| 文件 | SHA-256 |
| --- | --- |
| 新 CLI 实现 | `4b7d9dc15b3609ac7c952edff6b26fc131dff531a864692903676a886ea9b5b2` |
| 更新器保留的旧实现及其副本 | `e461a361540882a759031dd94ad4814b0ba109183cdfdf18013b639539a9af7b` |
| 新版官方 android-cli/SKILL.md | `f48b09bad739de88218180c1a1f410ecec50c42631159305ccf3f2f17c601396` |
| 未变的 android-profiler/SKILL.md | `d3083b151de83707950ac4edde68e84a11d153bd83d334e5315a44d45ce13b6be` |

更新来源是已安装 Google CLI 的自带更新器，未指定替代下载 URL。[官方发布说明](https://developer.android.com/tools/agents/android-cli/release-notes)本次读取仍只列到 `1.1.16717390`；因此新版行为只按实际 help 和执行结果记录，不补写未公布的修复原因。

## 命令差异与选择

更新前后对照的 10 组 help 均正常退出。顶层、input、input tap、layout、screen capture、docs search、skills update 的帮助内容相同；现有截图和布局调用使用的 `--device`、`--output`、`--annotate`、`--flat`、`--full`、`--no-idle` 仍存在。显式 SDK 与 `--no-metrics` 组合的 layout help 也成功。

可见的差异是 profiler 帮助明确 heapdump 的 API 条件，以及 systemtrace 描述加入 Compose composition；device hub 的 `--device` 说明增加 AVD ID。另查新版 `profiler heapdump capture --help` 和 `profiler systemtrace configure --help`：heapdump 默认 hprof，hprof 要求 API 29+，perfetto 类型要求 API 31+。这些是帮助所述能力，不是设备采集结果。

现有[工具链指南](../../TOOLCHAIN.md)已经要求按当前 help 选择命令，并区分原生输入、WebView CDP、ADB 和性能采集，本次无需修改。实际性能任务仍须先按已安装版本确认类型、API 和采集副作用；本次没有启动 hub、录制或安装设备 helper。

## 本轮验证

| 检查 | 实际结果与证据范围 |
| --- | --- |
| 版本与 Doctor | `android --version`、Doctor 原有的 `android --no-metrics --version` 均返回 `1.1.16919734`、退出码 0。另通过现有 Doctor 函数执行真实 CLI 版本查询，正确解析新版；其余外部命令由注入 runner 明确拒绝执行，报告为 partial，不是完整环境或设备通过。 |
| 命令帮助 | 新旧 10 组 help 对照通过；另有 SDK/layout、heapdump capture、systemtrace configure 三项 help 通过。均未操作设备。 |
| KB | `android docs search 'Android CLI input WebView accessibility profiler'` 成功，返回 10 条，包括 WebView 内存、启动和页面集成文档。搜索结果不证明 profiler 采集能力。 |
| 受影响离线路径 | `node --test tests/diagnostics.test.cjs tests/android-inspect.test.cjs tests/native-layout.test.cjs`：10 通过、0 失败、0 跳过。为现有替身合同测试，不是真机操作。 |
| 官方 Skill | 两份 Skill 的 quick_validate 均通过；全目录摘要对照确认 profiler 和全局 Gold Experience Skill 未变。格式校验不证明当前聊天已热重载。 |
| 候选保留 | RC.1 ZIP 的 SHA-256 仍为 `f9df530951acd1f476cef0c33985296b2dc9b5d7efe7e5b6fcc1bd60b5024238`；RC.2 仍为 `89719e753d8e9028f2574d49d11a66099aeedd0d105ba19cdfe2a168a6ba8666`。未重打候选。 |

原始输出、帮助差异、安装前副本、文件摘要及本轮检查记录保存在项目内忽略目录 `artifacts/android-cli-refresh-20261113-16919734/`，不上传。当前交接目录已有 export-ignore；本轮只改此目录，并核对 Git archive 的文件集和逐文件内容，候选 payload 保持不变。

## 保留的边界

本轮没有新的 Android 设备、App、截图、输入、WebView、trace 或 heapdump 验证，也没有运行真实游戏或私有输入。未重复完整 Node/Python 套件或 RC.2 隔离安装；项目代码与有效载荷未变，复用原固定提交的证据，不称为本次新运行。未重试受阻的 child Codex 工具探针，不改变宿主权限；其原阻塞仍成立。未合并主线、创建 Tag/Release 或改动正式资产。
