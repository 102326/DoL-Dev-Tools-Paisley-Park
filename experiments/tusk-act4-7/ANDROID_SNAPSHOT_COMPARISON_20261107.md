# Android 设备侧快照实验与取舍

2026-11-07（Asia/Shanghai）。**本轮决定继续使用现有 Android CLI / ADB / CDP，不把新探针接入生产。** 已完成自有 Kotlin App 的状态、生命周期和同机读取对照，补齐了此前只有 Activity 演示、没有取舍证据的缺口。探针已卸载，旋转设置恢复，设备已释放。

批量读取能减少本实验的命令往返，但单次读取没有优于预热后的标准布局入口，也没有证明真实 DoL 调试收益。原型保留在 `experiments/`，不进入正式包，不新增 Runtime、Ledger、后台服务或发布条件。

## Delivered

用户授权继续 7.0 后续开发并释放平板。固定输入 `ff618b843f9cda0eebfffa7cc13e52b4a1b14a09`；复用既有 `org.paisleypark.tuskprobe`，安装前确认 user 0 未安装，不接管其它 App 数据。

- `d068ea8` 增加 ContentProvider：只返回本 App 的进程/Activity/计数、可用状态、revision 和设备单调时间，单次 1..16 行。不含游戏、网络、截图、文件读取、设备控制或业务执行。
- `38bdfcffa390dda62a5f4e97f690aa2ba5c77c33` 将对照驱动改为官方 Android CLI layout。成功数据来自当时工作树；最终驱动另加 SDK 绝对路径前置校验，没有为该校验重跑计时。
- `8e63e7a7322661620f182c50e5bbc15b9d1ea5e8` 修复截图发现的文字遮挡：使用无 ActionBar 主题并应用系统 insets。新界面实机截图确认完整显示；未把 UI 修复后的 APK 冒充计时输入。

Provider 的对外访问要求 `android.permission.DUMP`；这个权限由 Android 组件机制检查，不是新权限系统。参考通过官方 Android CLI Knowledge Base 实际读取的 [provider 元素](https://developer.android.com/guide/topics/manifest/provider-element)与 [ContentProvider 实现说明](https://developer.android.com/guide/topics/providers/content-provider-creating)。本轮没有用额外无权限 App 验证跨 UID 拒绝，不声称存在自建安全沙箱。

## Validated

使用同一获准 M367FC 平板、Android 17、user 0，Windows `10.0.26340.0`、Node `26.13.0`、PowerShell `7.6.5`、ADB `37.0.1`、官方 Android CLI `1.0.16486076`。复用现有 Gradle 8.9、AGP 8.7.3、Kotlin 2.0.21、JDK 21.0.11、SDK 35 / Build Tools 34，编译 JVM 17；两次构建均用 `--offline --no-daemon :app:assembleDebug`，没有安装或更新工具链。

| 项目 | 实际结果 |
| --- | --- |
| 构建与制品 | 0.2 首次离线构建 27 秒；UI 修复 0.3 增量构建 15 秒。编译通过与实机加载分别核对。 |
| 原按钮与原状态 | 官方 layout 定位 Increment；标准 Debug Action 点击一次，原生读回 0→1、revision 2→3，进程/Activity 不变。 |
| 输入边界 | count=0、17、重复 count、未知参数、未知路径、projection 与 delete 共七项拒绝，前后本 App 状态相同；16 行上限正例通过。 |
| 三轮稳定读 | 每轮一次快照、五次独立查询、五行批量查询与一次官方布局；进程/Activity/计数/revision 相同，布局文本与原生字段一致。 |
| Activity 更换 | 从实际 ROTATION_90 转到另一方向，进程 UUID 不变、Activity UUID 改变、非零计数 1 保留。 |
| 后台与返回 | 标准 Home Action 后返回 unavailable、activity/count 为 null，未写成零；显式返回原探针后同进程与计数 1 可见。 |
| 进程重启 | 仅 force-stop 自有探针。随后查询启动新的 Provider 进程但无 Activity，返回 unavailable/null；显式启动 Activity 后读到新进程/Activity，计数 0。这不是持久业务恢复。 |
| 显示修复 | 原截图确有 ActionBar 遮挡；0.3 实际安装后截图确认全部字段可见，当前原生快照对应新界面。 |
| 清理 | 按当前 APK 摘要及自有 UID 核验后，只从 user 0 卸载探针；原旋转值恢复，ADB forward 为空。原游戏无业务/重载/重启/数据清理动作，默认历史 Store 仍未创建。 |

| APK | SHA-256 |
| --- | --- |
| 0.2，实际计时与生命周期输入 | `7491dedfa6959888a3d53dcf7dbdfcb12f450a87be2a409df5585113c4f7cb0a` |
| 0.3，UI 修复与最终卸载核验 | `b92ab929f56dd063ff4d880f49a703c97aba2cfa6ac8cc1e742bd5d2d449ca0f` |

### 同机测量

下面是 Windows 调用命令到结果可读的墙钟时间，包含工具启动、ADB/IPC 和输出成本；没有分解这些成本的物理原因。

| 路径 | 三轮毫秒值 | 中位数 |
| --- | --- | --- |
| 一行原生快照 | 1145.4 / 1138.8 / 1141.5 | 1141.5 |
| 五次独立原生查询，总计 | 5595.7 / 5638.0 / 5647.6 | 5638.0 |
| 一次查询五行 | 1104.5 / 1135.4 / 1137.6 | 1135.4 |
| 官方 CLI 一次完整布局 | 2487.2 / 1065.9 / 1082.7 | 1082.7 |

完整布局返回约 6,867 字节，五行自有状态约 1,565 字节，信息范围不同。首轮 layout 明显更慢，后两轮预热范围为 1065.9–1082.7 毫秒；没有把首轮去掉后重新计作三个成功样本。

五行批量读只是同一请求内的连续即时快照，不能代替五次间隔等待，也不代表五个不同业务任务。单行已包含所有状态字段，真实任务不应为制造批量收益而重复查询。本轮约 5 倍的“独立五次/单次批量”差异，只证明这条实验命令链减少调用次数，不是 Kotlin、DoL 或 Agent 的整体加速结论。

### 保留的失败

最初对照使用已有 `uiautomator dump`，进程约 304 毫秒后以 137 退出，无解释文本。没有重试或清除这条失败。后续只读探针状态不变；已知可用的官方 CLI layout 作为另一条对照路径，完成了上述新实验。退出原因仍 Unknown，未归因为系统或其它会话。

只读诊断中尝试 `dumpsys activity instrumentation` 的语法在当前系统不支持，另保留原响应；它没有提供退出 137 的原因。没有杀全局 ADB、关闭官方 CLI instrumentation 或更改系统权限来制造通过。

## Not validated

真实 DoL/Mod 中的设备侧观察、WebView/CDP 对照、后台等待、动作执行、业务回执、持久化、其它设备、无权限独立客户端与生产 Host 接入均未验证。本实验不解决原 App 的完整账本缺失、四条旧 Unknown、历史 CRLF receipt 或 F07 根因。

本轮没有重跑不受影响的完整本地 Node/Python，也没有重新打包工具 ZIP；改动仅在已 export-ignore 的 Android 实验与交接文档。APK 是本地自有调试制品，未上传；当前开发包版本和安装的全局 Skill 未改。

## Known limitations 与决定

采用策略为：**保留原型，生产继续现有三剑客。** 只有真实项目出现无法由现有 ADB/CDP/Android CLI 有效解决的设备侧任务，并能衡量接入成本与收益时，才重新考虑。不是因为 Kotlin 原型未升级为代理，就新增 7.0 阻断项。

Provider 查询可能启动自己的进程，不能称为物理无副作用。它只提供即时事实，不保持旧绑定、处理 Goal、执行动作或结清 Effect；调用方必须理解 identity/availability。冷读 unavailable 和 count=null 不等于游戏状态归零；进程、Activity、Bundle 与持久业务是不同边界。

原始命令、快照、计时、APK、完整布局与截图保留本地忽略目录 `artifacts/android-snapshot-20261107-175602/`。公开摘要不包含设备标识、进程 UUID、私人应用清单、通知、游戏或签名密钥。已结束设备窗口；main、Tag、Release 和正式 7.0 更名未操作。
