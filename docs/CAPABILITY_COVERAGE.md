# 最终蓝图覆盖与验收边界

对照 [原文](proposals/CAPABILITY_BLUEPRINT.md) 第0..88节，按能力组登记。实现、依赖可用、采集完整和业务验收分别判断。外部路径复用已有工具；条件能力缺少目标接口/权限时必须 unsupported/unknown，不能编造证据。

1.5产品已经正式收口。任务状态采用Completed／Implemented, coverage limited／Not implemented；Optional Integration和Future coverage另列Coverage Ledger，不是本轮Not implemented。以本行声明范围判断，代表性验证足够时可以完成任务，不把覆盖有限描述成产品未完成。更细的责任与复用流程见[收口说明](CLOSEOUT_1_5.md)。现有能力的精度上限保留；专项调查按问题复用专业工具或目标接口。

| 原文章节 | 核心状态 / 覆盖登记 | 已有路径 | 当前证明与条件 |
| --- | --- | --- | --- |
| 0..6 定位/现场入口 | Completed | [架构](ARCHITECTURE.md)、Doctor、Android CLI、CDP、ADB、Skill | Generic不依赖SW；公开契约/故障隔离已有离线与现场证明；依赖设备/App调试配置 |
| 7 scrcpy | Completed（检测）；可选外部流程 | Doctor检测；已有scrcpy可人工镜像 | 可选，当前缺失不安装、不阻断Generic |
| 8..9 Generic/CDP Automation | Implemented, coverage limited | evidence/inspect；保留审阅后使用的evaluator | 显式page ID/唯一标准title；歧义不换目标；通用evaluator不冒充只读约束 |
| 10..12 截图/录像/动画 | Implemented, coverage limited | capture/record/animation-frames；visual-diff逐帧比较 | 真机静态与短录屏已有资料；受控取帧通过；完整DoL动画仍按场景验收 |
| 13..17 Action/Recorder/Replay/Plan | Implemented, coverage limited | action/journey/journey-record；有限动作/等待/checkpoint | 离线与选定真机场景证明；Recorder输入省略、候选需审阅补全；非自动生成业务测试 |
| 18..19 原生/生命周期 | Implemented, coverage limited | Android CLI既有交互；native-layout；app-lifecycle/diff；launch/restart/home/back/wake/lock/unlock/rotate；[目标原生配方](NATIVE_RECREATE.md) | helper真机通过；系统退出元信息固定user/UID/boot/PID；屏幕关闭与本人认证后返回通过，旧restart partial保留；独立Lyra副本Activity连同WebView及同Activity内独立WebView替换分别验证。未知App原生入口和凭据认证不推断，Page.reload不能替代 |
| 20..24 DOM/CSS | Completed | scoped snapshot/diff、白名单computed style | scoped/截断/结构地址已验证；不是稳定DOM身份或全局镜像 |
| 25..27 Golden/Visual/Region | Implemented, coverage limited | 明确参考文件与visual-diff可选region | 比较可运行；同尺寸不足以证明字体/场景/平台等条件一致；不自动更新Golden |
| 28..32 Event/Mutation/Observer/Ownership/Selector | Implemented, coverage limited | timeline、可选instrumentation、dom-inspect | 有限窗口/新Observer创建与方法/清理；已有实例与callback闭包未知；作者归属需公开Integration |
| 33..36 Storage/Console/Error | Completed | storage-snapshot/diff、Console元信息、timeline错误种类 | 无记录/输入/错误正文；遗漏与未知分别记录；摘要不足以判断根因时停止推断 |
| 37..40 Network/HAR/高级工具 | Implemented, coverage limited | Network摘要JSON是等价网络证据；network-scenario；外部代理按问题选用 | 无path/header/body/原始error；受控离线与恢复通过；不能保证异常终止恢复；代理不成为依赖 |
| 41..46 Android性能/热电状态 | Implemented, coverage limited | logcat、gfxinfo/meminfo、perf-series、perf --deep/bugreport、thermal/battery；复用android-profiler分析 | 普通采样、3秒trace录制与外部schema/目标调度解析、bugreport ZIP完整性均经真机验证；设备帧标志及具体性能根因仍按问题调查；severity不自动等于CPU降频 |
| 47 Leak Probe | Implemented, coverage limited | 数值/leak-probe + Journey重复动作/checkpoint +可选Observer窗口 | 旧4MiB超限partial保留；64MiB单请求修复后真机detached、三次真实设置打开关闭/复采Journey及清理通过，截断投影为下界；不强制GC/泄漏判决 |
| 48 Performance Timeline | Completed | evidence-timeline对齐Action/collector与有锚的target事件 | 传播遗漏、未知锚、误差与longtask start；不把native累积gfx还原为逐帧事件。完整原生关联依赖trace/目标事件 |
| 49..52 Provider/Environment/Mod | Implemented, coverage limited | environment/profile/snapshot/diff | 真机Provider与公开Mod报告可读；未知enabled/loadOrder为null，reportedIndex非实际执行顺序 |
| 53..54 兼容/设备/视口矩阵 | Implemented, coverage limited | matrix显式目标/preconditions；viewport-matrix | 单设备选定用例与浏览器三宽度通过；metrics不模拟其它实体设备；失败停止，无自动切换配置/安装 |
| 55..58 Accessibility/Hitbox/Overlay/Scroll | Implemented, coverage limited | 六类Inspector、hitbox-overlay SVG | 简单颜色、中心命中与矩形；非完整WCAG、真实全部点击区域或全局绘制次序判断 |
| 59..60 Integration/Runtime | Completed；其它专属桥为Optional Integration | Contract1、SW可选桥、外置模块与独立DOM例子 | 缺失/未知/异常不阻断Generic；Runtime由目标作者维护，未知私有API不猜测 |
| 61..70 Evidence/Schema/Privacy/Repro/Support/Full | Completed | manifest/envelope、SHA/incident/time、固定投影、复现说明、重型选项 | 截图/录像/trace/自由文本分别审查；完整包非业务通过；默认Support不扩大正文/二进制范围 |
| 71..76 Compare/Known Good/Report/Collector/Doctor | Completed | 离线证据工具、整包生命周期比较、Support/Evidence报告、独占输出、状态隔离、Doctor | 篡改/路径/缺失/固定投影已验证；Support投影时间不冒充原采集时间，不验证原制品；参考不自动证明业务正确；报告不上传 |
| 77..84 Skill/边界/独立/公开格式 | Completed；新增Skill候选为Future coverage | 仓库Skill路由实际工具与目标命令；[独立安装](SKILL_INSTALL.md) | 独立安装/定位与前向证据比较报告通过；新回合宿主目录已发现；测试操作与真实数据破坏权限分开 |
| 85..88 排除项/CLI/开发闭环 | Completed；新增目标适配为Future coverage | 复用工具；[Workshop](WORKSHOP.md)；[目标原生配方](NATIVE_RECREATE.md)；[业务Mod更新](BUSINESS_MOD_UPDATE.md) | 独立真实游戏APK同签名更新、版本/UID/sentinel及游戏就绪通过；主游戏DoLGameUI 2.0.3→2.1.0持久更新、加载源SHA/运行时版本、设置行为与App重启复验通过。不是所有业务/存档/其它设备回归；不增加业务Runtime/任意执行DSL |

[关联进程内存](PROCESS_MEMORY.md) 已使用系统公开packageList、user/UID和PID meminfo在真机验证。它补多进程观察，但不能将关联进程自动指定为某个page的renderer。

[生命周期元信息](APP_LIFECYCLE.md)提供系统保留的进程退出记录及固定投影比较，不保存堆栈或description，也不将新增报告误当成新发生事件。它没有为旧重启用例回填通过，不能证明Activity/WebView原生重建。

固定自有WebView夹具还在授权App跑通真实源码→build/deploy→矩形复验与节点/转发清理；制品加载为临时自有DOM，不等于持久业务Mod/APK部署。只采自有scope CSS，不采页面正文或业务状态。

1.2发布后新增Android隔离origin持久Mod夹具：完整游戏前空白存储预检，固定父document/context，真实IndexDB部署、自有源SHA/版本与新frame尺寸复验complete；公共格式及清理确认通过。它补充Android隔离持久加载的证明，主游戏业务Mod/APK、App重启和原生WebView recreate仍按各自接入条件判断。新增能力统一汇入[1.3](RELEASE_1.3.md)，原1.2 ZIP保留。

统一封装验收包括通用源码检查、独立Skill安装/任务使用、自有Workshop源码/制品/加载/复验，以及源码包独立解压后的入口与资料排除检查。持久Mod桌面与临时节点Android证明分别登记；后续真实业务Mod/APK与专有recreate、重型证据/helper的独立证明见[最终验收](FINAL_ACCEPTANCE.md)。未知项目/其它实体设备依自身条件核对，缺条件不伪造通过或扩大权限。历史发布证明见[VALIDATION](VALIDATION.md)。

1.4历史阶段记录已证明真实游戏APK更新、Activity连同实际WebView重建、主游戏真实DoLGameUI发行更新与App重启后的设置复验。后续清单发现独立WebView-only、重型/helper实机证明及锁屏生命周期仍需补齐；这些新结果不回填旧发行包，见[最终验收](FINAL_ACCEPTANCE.md)。Skill优先组合已验证Android CLI/Profiler、Chrome DevTools与目标项目流程，不另造对应系统。
