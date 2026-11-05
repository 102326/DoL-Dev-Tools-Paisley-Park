# 新 TS 基线：Android 只读实机复验

2026-11-05（Asia/Shanghai）。本轮在已协调的平板独占窗口完成只读采集和连接绑定检查，**当前范围 Scoped Done，设备已释放**。未重新执行桌面批次，未修改运行时代码、安装包或存档。

固定输入为 `f01f5af2398a264d02ed9ef1e73b8d6a95a33215`，实际代码对应 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`；本地与远端一致，开始时工作区干净。通过项目 resolver 确认本工作树的预编译 CJS 入口，使用 `--no-strip-types` 运行。包版本仍为 6.1.0，7.0 是当前研发目标。

## Delivered / Validated

实际设备为获准的 M367FC 平板、Android 17、user 0；前台为既有 DoL 测试 App，未锁屏。WebView 为 `com.google.android.webview` 156.0.8078.47，CDP product 为 Chrome/156.0.8078.47。Node 26.12.1，Windows build 26340.0，PowerShell 7.6.5，ADB 37.0.1。

采集始于 23:44，释放确认于 23:48（+08:00）。本次仅使用现有 ADB、生产 CDP / execution-context 和标准 Evidence，没有安装 helper、切换/重启 App、重载页面或派发游戏/保存动作。

| 实际检查 | 结果 |
| --- | --- |
| 标准 Evidence CLI | 16 步完成，failed / unsupported 均为 0；包含 DOM、CSS、Console/Network 元数据、截图、环境和性能摘要。complete 只描述本次请求的采集。 |
| 现场版本 | StartConfig 0.5.12.13，Loader 2.101.1；GameVersion Mod 来源仍为 unknown，未拿 App 版本代替游戏版本。 |
| 精确身份 | 核对设备/user/前台 App，原 App PID、唯一实际 WebView 页面、完整 URL、frame/loader 与 timeOrigin 相互对应。 |
| 上下文覆盖 | `Runtime.evaluate` 的外来 contextId / uniqueContextId，以及 `Runtime.callFunctionOn` 的 context 覆盖均在只读请求前拒绝。 |
| URL 元数据回退 | 从当前 frame 的副本移除可选 fragment 字段后，生产 `documentURL` 经真实原生 navigation history 读取完整 URL。原 frame 未修改；这不等于测试另一种旧 Provider。 |
| 关闭与重新连接 | 关闭本轮旧 transport 后，旧生产 holder 的读取和对象调用均返回 `ANDROID_BINDING_CLOSED`；显式新建执行绑定可以观察同一实际页面，旧 holder 没有自动复活。 |
| 状态边界 | 前后 PID、frame/loader、timeOrigin、Passage 与回合数相同。检查只读取这些事实，没有调用游戏业务或存档 API。 |

本轮六项绑定检查通过，未出现拒绝之外的异常或结果不确定动作。旧 holder 拒绝是预期边界，不是采集失败。没有通过截图失败重放先前保存，也没有修改预算/权限/回执合同。

另以 SQLite `readOnly` 方式复核本工作树的五个既有实验 Store：此前真实 PC 场景 Store 有 4 条已结算 Effect、0 条未决；四份中性恢复夹具各保留 1 条预期未决。没有执行恢复、结算、迁移或清理命令，也没有打开设备或用户历史业务 Store。

## 设备释放

两个本轮自有 production transport 的清理结果均为 completed；标准 Evidence 自身的连接也已清理。结束时 ADB forward 列表为空，与开始时一致；设备仍连接，原 DoL App 仍在前台。未停止全局 ADB server。设备可交给 UI，后续再操作须重新协调窗口。

原始命令、绑定记录、截图、设备标识及释放证明仅留在本地忽略目录 `artifacts/android-ts-20261105-234444/`。本报告只上传脱敏结论，不上传 Profile、SQLite、游戏状态或截图。

## Not validated / Known limitations

为保护用户当前未保存进度，本窗口没有执行 reload、hash 导航、App 生命周期变化、主动断连、输入或 GER 业务。因而本轮不证明“新 TS 基线在真实文档替换后拒绝旧 holder”；只证明原文档观测、上下文约束和关闭连接后的拒绝/显式重绑。旧基线曾做过的 reload / 保存恢复仍保留原身份，未计入本次通过。

未验证其它设备/Provider、真实历史 CRLF 回执或旧 Unknown 的跨构建恢复。F07 初始空文档和桌面多标签截图的物理根因仍为 Unknown；本轮成功不能用于追认已修复。

参见 [Windows 接续记录](WINDOWS_REPORT.md)和[接续任务书](../../docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md)。本轮无生产代码修复；文档一致性核对后按已授权流程同步原实验分支，不合并 main、不发布 6.1 补丁或 7.0 Release。
