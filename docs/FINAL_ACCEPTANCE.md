# 完整能力验收：2026-10-06

以[原始蓝图](proposals/CAPABILITY_BLUEPRINT.md)0..88节和[能力覆盖](CAPABILITY_COVERAGE.md)为清单。通用核心、目标作者Runtime、可选Integration与公共Skill分层；优先复用成熟工具和Skill，只对DoL目标绑定、脱敏格式及实际缺口做薄封装。外部能力的条件不会被改写成默认通过。

| 新增验收 | 实际证明 |
| --- | --- |
| 官方Perfetto录制与分析 | 固定Android离线测试App、3秒录制complete/exit0；2,764,807字节trace。另复用android-profiler官方Trace Processor v57.2确认schema、2.978546976秒跨度、70,038个调度slice及目标进程14,207个slice；非零error stats未观察到。核心仍traceParsed=false，外部收据独立 |
| bugreport完整性与分享边界 | complete/exit0，48,475,418字节、421 ZIP条目；标准库CRC/main entry检查通过，dumpstate完成后未继续运行。Support投影不带原ZIP；系统可能保留自己的副本 |
| Android CLI Native Layout | 复用已有CLI/helper，complete/exit0；flat 2节点、无截断，不存text/contentDesc正文，不宣称所有原生窗口已测 |
| Detached采样 | 旧4MiB响应超限与DOM.disable未确认的partial保留；显式单请求64MiB修复后available、清理确认。16,725棵报告树，投影最多200树、每树1,000 ID，截断计数为下界；无GC、heap正文或泄漏判决 |
| Leak Journey | 真机15步complete：基线、3次真实设置打开关闭、复采、150ms显式Observer窗口。临时自有按钮调用既有公开openSettings，关闭用真实按钮；不是原侧栏按钮可用性证明。两个detached检查点与DOM.disable、Journey传输清理均完成 |
| 原生WebView-only | 固定自有51204副本、同Activity/PID内实际WebView替换，旧token负例拒绝；业务Mod源SHA/版本、设置打开关闭及真正App重启后复验通过。四份CSS证据无截断；不推断全部业务/设置值/存档正确 |
| lock / unlock | lock确认屏幕关闭，不宣称强制凭据锁定。真实设备出现凭据锁屏时unlock按设计停止；用户手动认证后独立返回复验complete，Awake/showing=false、原测试页面就绪，自有节点/forward移除，原App前台恢复。凭据未读取/输入，未知或secure keyguard不自动dismiss |

实机资料仅保存在忽略的本地artifacts；发行包不包含APK、游戏、存档、密钥、媒体、trace或bugreport。原App的安装制品和既有连接保留。屏幕循环的初始收据保持partial，随后本人认证后的返回收据单独关联；此前cleanup中临时按钮没有现场确认，最终返回步骤明确移除并核验缺失，不能将初始清理标记当作独立证明。

以前的验收已经覆盖无Soft & Wet的Generic Evidence、Integration缺失/异常隔离、公共格式、选定矩阵、浏览器三宽度、网络/视觉/时间线/Storage/Inspector、进程内存、原生Activity重建、同签名真实游戏APK更新和主游戏业务Mod更新。历史结果与范围见[VALIDATION](VALIDATION.md)，旧包/tag保持冻结。

当前物理证明来自一台Android设备及明确选择的场景。其它Android/Provider/设备/Mod组合按蓝图选择必要用例，不默认跑完整笛卡尔积。未知项目的原生入口必须由作者提供；系统认证由本人操作。诊断摘要不是所有游戏、存档、性能根因或兼容性的保证。

统一源码96项回归、公开格式/SHA与独立Skill前向使用的实际结果见[验证记录](VALIDATION.md)。前向请求复用android-profiler→perfetto-sql和已有官方解析器，无重新采集或下载；源码包仍须独立解压、入口和资料排除检查，功能记录不能替代发行校验。
