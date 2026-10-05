# 最终蓝图覆盖与验收边界

对照 [原文](proposals/CAPABILITY_BLUEPRINT.md) 第0..88节，按能力组登记。实现、依赖可用、采集完整和业务验收分别判断。外部路径复用已有工具；条件能力缺少目标接口/权限时必须 unsupported/unknown，不能编造证据。

| 原文章节 | 已有路径 | 当前证明与条件 |
| --- | --- | --- |
| 0..6 定位/现场入口 | [架构](ARCHITECTURE.md)、Doctor、Android CLI、CDP、ADB、Skill | Generic不依赖SW；公开契约/故障隔离已有离线与现场证明；依赖设备/App调试配置 |
| 7 scrcpy | Doctor检测；已有scrcpy可人工镜像 | 可选，当前缺失不安装、不阻断Generic |
| 8..9 Generic/CDP Automation | evidence/inspect；保留审阅后使用的evaluator | 显式page ID/唯一标准title；歧义不换目标；通用evaluator不冒充只读约束 |
| 10..12 截图/录像/动画 | capture/record/animation-frames；visual-diff逐帧比较 | 真机静态与短录屏已有资料；受控取帧通过；完整DoL动画仍按场景验收 |
| 13..17 Action/Recorder/Replay/Plan | action/journey/journey-record；有限动作/等待/checkpoint | 离线与选定真机场景证明；Recorder输入省略、候选需审阅补全；非自动生成业务测试 |
| 18..19 原生/生命周期 | Android CLI既有交互；native-layout；launch/restart/home/back/wake/rotate | wake/后台返回通过；重启后的等待失败保留partial；凭据解锁与Activity/WebView原生recreate需目标自有接口；Page.reload不能替代 |
| 20..24 DOM/CSS | scoped snapshot/diff、白名单computed style | scoped/截断/结构地址已验证；不是稳定DOM身份或全局镜像 |
| 25..27 Golden/Visual/Region | 明确参考文件与visual-diff可选region | 比较可运行；同尺寸不足以证明字体/场景/平台等条件一致；不自动更新Golden |
| 28..32 Event/Mutation/Observer/Ownership/Selector | timeline、可选instrumentation、dom-inspect | 有限窗口/新Observer创建与方法/清理；已有实例与callback闭包未知；作者归属需公开Integration |
| 33..36 Storage/Console/Error | storage-snapshot/diff、Console元信息、timeline错误种类 | 无记录/输入/错误正文；遗漏与未知分别记录；摘要不足以判断根因时停止推断 |
| 37..40 Network/HAR/高级工具 | Network摘要JSON是等价网络证据；network-scenario；外部代理按问题选用 | 无path/header/body/原始error；受控离线与恢复通过；不能保证异常终止恢复；代理不成为依赖 |
| 41..46 Android性能/热电状态 | logcat、gfxinfo/meminfo、perf-series、perf --deep/bugreport、thermal/battery | 普通真机采样已验证；完整trace/dumpstate与设备标志语义仍需具体调查；severity不自动等于CPU降频根因 |
| 47 Leak Probe | 数值/leak-probe + Journey重复动作/checkpoint +可选Observer窗口 | heap/DOM/listener可读；当前真机detached不完整与清理未知保留partial；浏览器通过不扩成Android证明；不强制GC/泄漏判决 |
| 48 Performance Timeline | evidence-timeline对齐Action/collector与有锚的target事件 | 传播遗漏、未知锚、误差与longtask start；不把native累积gfx还原为逐帧事件。完整原生关联依赖trace/目标事件 |
| 49..52 Provider/Environment/Mod | environment/profile/snapshot/diff | 真机Provider与公开Mod报告可读；未知enabled/loadOrder为null，reportedIndex非实际执行顺序 |
| 53..54 兼容/设备/视口矩阵 | matrix显式目标/preconditions；viewport-matrix | 单设备选定用例与浏览器三宽度通过；metrics不模拟其它实体设备；失败停止，无自动切换配置/安装 |
| 55..58 Accessibility/Hitbox/Overlay/Scroll | 六类Inspector、hitbox-overlay SVG | 简单颜色、中心命中与矩形；非完整WCAG、真实全部点击区域或全局绘制次序判断 |
| 59..60 Integration/Runtime | Contract1、SW可选桥、外置模块与独立DOM例子 | 缺失/未知/异常不阻断Generic；Runtime由目标作者维护，未知私有API不猜测 |
| 61..70 Evidence/Schema/Privacy/Repro/Support/Full | manifest/envelope、SHA/incident/time、固定投影、复现说明、重型选项 | 截图/录像/trace/自由文本分别审查；完整包非业务通过；默认Support不扩大正文/二进制范围 |
| 71..76 Compare/Known Good/Report/Collector/Doctor | 离线证据工具、独占输出、状态隔离、Doctor | 篡改/路径/缺失/投影已验证；参考不自动证明业务正确；报告不上传 |
| 77..84 Skill/边界/独立/公开格式 | 仓库Skill路由实际工具与目标命令 | 结构检查通过，未全局安装；测试操作与真实数据破坏权限分开 |
| 85..88 排除项/CLI/开发闭环 | 复用工具；[Workshop](WORKSHOP.md) | 受控桌面源码→build→deploy→同场景复验通过；真实项目制品部署/加载和真机复验仍需项目证明；不增加业务Runtime/任意执行DSL |

[关联进程内存](PROCESS_MEMORY.md) 已使用系统公开packageList、user/UID和PID meminfo在真机验证。它补多进程观察，但不能将关联进程自动指定为某个page的renderer。

最终统一封装前保留的门槛：真实目标项目构建/部署/加载证明与同场景真机复验，Skill最终安装/独立任务使用，源码包独立解压后的入口与资料排除检查。重型证据、helper、其它实体设备与专有recreate按可用条件分别记录；缺条件不伪造通过或扩大权限。开发中不发布新的ZIP/tag/version。
