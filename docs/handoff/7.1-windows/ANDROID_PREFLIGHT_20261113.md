# 7.1 平板只读预检

2026-11-13，基于 `14d0ee26f4cd58683f0a2dbc4dd55ea8c1f45362`。本阶段已完成实际设备与诊断入口核对；没有进入 App/WebView 操作，不代表 Android App 重建、真实业务或 Agent A/B 已验证。

## 目标与授权核对

用户通知平板已连接并允许有界测试。本轮只使用明确选定的单台设备、当前 user 0 做系统、包和工具只读观察，不把这句话扩张为安装、清数据、删除存档或共享云操作。

实际连接为一台 M367FC、Android 17 / API 37，ADB 状态 device。相关会话状态未显示另一位正在执行的工作者；这只是状态观察，不是排他设备租约。前后两次窗口核对都为系统桌面，没有抢界面或切换 Activity。

原测试包 `com.vrelnir.dol.lyra.uicompat051213` 仍安装，版本 0.5.12.13，处于 stopped 状态；`pidof` 返回 1 且无 PID，没有该包可绑定的运行中 WebView。旧独立验收包 `org.goldexperience.acceptance7` 及旧原生验证包 `org.doldevtools.validation.lyra051213` 本次都未发现安装路径，未自动重装。

设备端对原 APK 计算的 SHA-256 为 `ab67be61aea19cb259dae155356f7621cd6114d3209c66ca88a4162cbb9b9585`，与[7.0 独立验收记录](../../../experiments/tusk-act4-7/ANDROID_INDEPENDENT_RECOVERY_20261107.md)中的原 APK 一致。PackageManager 显示签名条目存在；其短签名标识不是完整证书 SHA，本轮未独立提取证书指纹，也未拉取约 192 MB 的 APK。

相同 APK 只能复用制品身份结论，不能证明当前数据代次、存档、Mod、账号或云仍与旧实验相同。当前数据来源、共享云关联及可恢复备份均缺少有效现场证据；安装包允许系统备份也不是已有可用备份的证明。旧独立包成功和文件级副本实验都不能补足这些事实。原目标的历史 Store/Unknown 未读取、恢复或结清。

## 实际执行与结果

| 层级 | 本轮实际证据 |
| --- | --- |
| ADB | 当前版本 37.0.1-15733141；真实执行精确设备的状态、当前用户、系统版本、目标包路径/元数据、APK 摘要、PID、调试 socket、WebView Provider 和 forward 清单查询。初次 devices 自动启动了原本未运行的本机 ADB server，没有杀死或重启已有 server。 |
| Android CLI | 版本 1.1.16919734；本机版本调用、screen help 及 Doctor 中的版本识别成功。没有运行 screenshot、layout、input、hub 或 profiler，不将这些帮助/版本结果算作实机执行。 |
| 标准 Doctor | 本对话普通执行入口通过项目 resolver 定位当前 7.1.0-rc.2，随后真实运行 `doctor --serial DEVICE --package REVIEWED_PACKAGE --out NEW_JSON`。仅进程环境显式指定现有 ADB/Python，没有安装或修复环境。14 项检查中 11 available，3 unavailable：scrcpy、app-process、webview-socket。 |
| WebView / CDP | 系统 Provider 实测为 com.google.android.webview 156.0.8078.47；目标 App 无运行 PID，未创建 CDP 连接、文档绑定或 forward。因此没有当前 frame/loader/uniqueContext/Origin 证明。 |
| 性能 | Doctor 实际找到设备上的 Perfetto；没有录制 trace、heapdump、运行 prepare 或更新工具。Profiler Skill 的录制流程本轮未进入。 |
| 结束状态 | 设备仍连接、user 0、前台仍为系统桌面、目标包仍 stopped；forward 前后相同且为空。没有启动、重载、安装、卸载、清数据、游戏动作或私有存档读取。 |

Doctor 按现有合同输出 `complete`、退出 0，因为连接、包和必需环境检查通过；App 进程与 socket 是可选项，实际仍为 unavailable。必须阅读这些逐项结果，不能把 complete 解读为 App/CDP 已就绪或业务通过。

原始观察窗口、精确命令参数、唯一设备标识、包安装路径/原生身份、stdout 和 Doctor Envelope 留在项目忽略目录 `artifacts/android-preflight-7.1-20261113/`。首次选定设备状态文件写于 `2026-11-13T12:33:53.117832Z`，Doctor 自身时间戳为 `2026-11-13T12:42:16.530Z`；结束核对为 `2026-11-13T20:45:26.7078491+08:00`。没有上传设备标识、原始日志、账号配置、截图、APK 或存档。

汇总时曾将 Doctor Envelope 当成报告正文，出现一次本地 `KeyError: status`；改为读取已保存的 `data` 字段后完成汇总，没有重跑 Doctor 或设备动作。空匹配的 helper 查询也未形成可用的安装状态证据，本轮不据此声称 helper 已安装或不存在。没有出现工具策略拒绝。

本次正常父执行入口的 resolver/Doctor 与旧 child Codex 探针是不同任务。没有启动 child Codex、重试其被拒绝命令、改宿主权限或进行 source-find 探针；父入口成功不能证明旧 `registered Core launch requires an installed app` 阻塞已解决。

## 后续按具体动作判断（接续校准）

首轮确实没有启动 App，上文原始观察和数据/备份未知项保留。但当时把完整备份作为普通启动的一概前置条件过宽，按用户后续校准予以纠正。相同 APK 摘要、已确认目标和既有准确授权可以支持普通 MAIN 启动及只读诊断；没有新的证书提取结果，也不自动否定已有足够的制品身份依据。应检查启动本身是否存在具体的存档写入、自动云同步或 Mod 迁移通路，而不是因没有穷尽所有备份情况就停止普通测试。

清数据、重建、覆盖/删除存档、安装新包和变更共享配置仍需要对应范围与恢复条件；重载等操作按当前内存进度、实际自动写入通路和授权判断，不能与普通只读观察混为一谈。出现实际风险或目标变化时只重核受影响项，不重问未变化的准确授权。

后续已核对同一 APK 的原生验证材料，并在用户释放设备且已打开 DoL 后完成新生产文档绑定，见[普通启动判断与实际只读接续](ANDROID_START_READONLY_20261113.md)。这不改写首轮当时没有运行文档的事实，也不把同一 APK 当成当前 frame/context 的证明。

独立验收包已经不存在；若后续选择重建它，需要对应输入、安装/初始化/清理范围和恢复条件的明确授权，不能把旧已结束实验自动续作。本轮没有为填满验收项创建新 Store、包或设备范围，也没有重复文本评测或文件实验。

本次仅新增源码交接记录。文档链接、版本/命令一致性、隐私和实际 Git archive 文件集检查通过后同步维护分支；未改变候选 payload 时不重打 RC.2，不合 main、不建 Tag/Release。旧文本争议及人工复核不由本轮结案。
