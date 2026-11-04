# Weather Report：GitHub同步与Mac侧验证收口

2026-11-04。版本号仍未确定。本次以 `48fc4f2ab9f3379cb7f5eae45a7e0022160e9f84` 为同步起点，已创建公开实验分支 `experiment/weather-report-20261104`；`main`、其它测试分支及Release保持原状。原型/维护代码和已有报告一起保留，未重新实现已关闭的维护修复。

## Delivered

- 完成新增历史脱敏及署名检查：同步前6个提交、78个新历史blob经过检查，私人维护报告、原始日志、Profile/Store、依赖归档未进入Git。远端48fc4f2引用与本地相同；GitHub实际author/committer均关联Codex bot。
- 补齐真实Codex宿主发现验货。[host-discovery/probe.cjs](host-discovery/probe.cjs)从已审ZIP提取工具，在独立临时Git项目安装Skill，实际启动两个Codex App Server进程。安装前项目路径无匹配；forceReload后及冷启动新进程后均发现同一项目级Skill，enabled=true，展示名正确，resolver回到受验包。只调用initialize/skills/list；不创建thread/turn、模型任务或全局Skill安装，不重写全局配置。
- 补齐独立包Runtime安装链。[package-check/runtime-smoke.cjs](package-check/runtime-smoke.cjs)确认缺XState时加载拒绝；按原锁从本地缓存离线安装后，确认5.33.2解析到包内，并在自有新SQLite中创建合成Session、检查schema2/integrity、关闭重开和原deadline，零Effect、零dispatch。Node26.13.0和最低26.0.0均通过。
- Kotlin增加可靠的 `readWindow(after)`：区分断连null、事件淘汰gap、当前空窗口及非法未来游标。独立审查发现它初版无意改变旧 `read` 的负数/未来游标行为；回归先复现失败，再恢复旧实现，严格校验只属于新API。原JVM及真实子进程SIGKILL/重启场景仍通过。
- 保留SDK无设备编译的具体可行性记录，没有用未编译Android源码或JVM替身冒充APK。SDK获取/许可选择仍等待负责人答复；它不是Windows技术门槛，也未因约82MiB候选组件略高于内部80MiB探索预算而认定Mac不能构建。

## Validated

### GitHub

同步起点的 [CI run 41778691640](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41778691640) 实际success：

| 环境/命令 | 实际结果 |
| --- | --- |
| GitHub Linux / `npm test` | 492项，490通过、0失败、2个平台专属跳过。 |
| GitHub / build guards | 2通过、0失败；严格类型、生成漂移及类型负对照步骤通过。 |
| GitHub Python3.10.22 / unittest | 10项，9通过、1个可选Pillow项跳过。 |

这是48fc4f2的实际远端结果，不冒充后续提交的CI。后续增量仅实验代码与验证材料，生产308文件payload未变；最终分支引用和最新工作流结果须在推送后核对。

### Mac

| 实际执行 | 结论 |
| --- | --- |
| `node experiments/weather-report-20261104/host-discovery/probe.cjs REVIEWED_ZIP` | CodexCLI0.166.0-alpha.6，项目精确路径0→1→1，repo/enabled，展示名与resolver正确。两个进程close均code0/signal=null；模型turn数0。 |
| `node experiments/weather-report-20261104/package-check/runtime-smoke.cjs REVIEWED_ZIP` | Node26.13.0独立包缺依赖拒绝、离线安装、包内XState及SQLite关闭重开通过。 |
| Node26.0.0运行同一Runtime smoke（显式选择已安装npm CLI） | 相同检查通过，schema2、integrity=ok、零Effect/dispatch。 |
| `experiments/weather-report-20261104/kotlin/run.sh` | 新窗口边界、旧read兼容及原JVM/真实独立进程场景通过。 |
| Git archive集合/摘要复核 | 当前生产payload仍是已验的308文件，逐字节与[manifest](package-manifest.json)一致；新实验和原始记录不进入归档。 |

受验ZIP来自 `346eb834a8309d81b5c5867b521b41a853f22fb2`，SHA-256为 `b4441894dba00719bba30d2660f1980057aa77ef75cb4889f519658f6d0a9601`。本轮复用同一固定字节，不重造同内容候选。结构化、已筛选记录见 [publish-results.json](publish-results.json)；原始协议、CI、npm和JVM日志仍留忽略的artifacts。

宿主发现首次在外层沙箱中因EPERM不能初始化，授权执行同一只读探针后通过。探针将Mac临时目录规范成realpath，并只输出自身匹配信息；不发布其它Skill元数据。独立审查补充了进程退出码核验，避免把close直接写成正常退出。Node26.0最初只有独立runtime、没有相邻npm，setup失败；增加显式npm CLI选择后通过，不能把这种setup失败称为产品/设备故障。

原全套Mac491通过/1Windows项跳过、最低Node源码测试24通过、独立包24通过、Schema20个共享输入等证据保持其原范围，详见[上一批接线报告](CONTINUATION.md)。本轮不重复没有变化的全套本地回归；远端CI按现有流程执行。

## SDK选择与未验证范围

无设备APK构建可以在Mac继续，但需要获取新的官方编译组件。候选HTTP metadata：platform-35_r02.zip 64,273,788字节、R8 8.7.18 17,650,417字节、aapt2 8.7.3 macOS 4,287,036字节，合计86,211,241字节（约82.2MiB）；不是已经验证完整的工具链，也未测解压尺寸/可执行架构。80MiB只是Primary最初给子任务的探索预算，不是用户上限或平台结论。

Primary已请求负责人决定是否允许隔离获取并同意[SDK适用许可](https://developer.android.com/studio/terms)。截至此记录尚无答复，所以没有下载/使用SDK、没有生成APK/签名或连接设备，也不尝试用许可不清晰的镜像替代。此前用户“不擅自安装大型依赖”的限制和新增SDK使用范围，是本次单独确认的原因；其它工作未等待此选择。后续若允许，仍须实际验证API/desugaring、打包及字节，再谈APK交付；若选择留Windows，就在那边继续，不将JVM通过替代Android验收。

以下仍为Not validated：Windows文件系统/文件占用/启动器，Android App/APK/真机/WebView与Android进程生命周期，真实DoL及非商店真实源码场景。Codex结论覆盖本机两个独立App Server进程，**不证明正在进行的Desktop对话热加载、自然语言选路效果、其它宿主版本或Windows**。这些边界与安装器/解析器是否成功分别记录。

## 当前结论与交接

无需新增SDK的既定Mac开发、原型及验证收口已经完成并可同步。SDK/APK扩展仍等待负责人选择，不能宣称已构建或下一版全项目完成。没有合并main、创建PR、Tag或Release，没有修改正式版本号、全局Skill/系统配置、旧Store/Unknown或玩家数据。

Windows接续应从本实验分支的固定提交开始，先检查本地未提交工作和来源，不用reset/clean覆盖。先做原维护分支的Windows定向项、真实源码多个区域的候选验证，再在授权自有App/设备上验证Kotlin归属/提交见证及与ADB/CDP的实际差异。完整战未来、跨版本索引和全仓语言迁移不因本次收口自动成为发布门禁。
