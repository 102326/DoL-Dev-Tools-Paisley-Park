# TS First C04 — 共享采集、脱敏与文件归属

2026-11-05。代码`e55a4d43c44462c2f4fe33370226f49a87181126`，基线`cff6da34b56c796e2900d38b6bd35e3a94378eff`。新增collectors、privacy、owned-files权威CTS；16/95核心入口、17产物。

## Delivered

共享事件Capture/Snapshot、ADB调用/forward清理、隐私输出及文件inode/partial bytes/cleanup有实际类型所有者；ChromeHost和Context直接消费它们，撤去过渡Capture接口。原事件字段仍由unknown进入，未伪称每条原始CDP事件已完整验证。原Android package/serial/forward检查和raw传输分工保持。文件清理遇到非Error异常时也保守报告未确认，不访问原异常字段。未清理任何真实数据或未知目录。

采集器的页面内版本查询JS与基线AST模板值逐字相等；其余业务注入函数与receipt指纹模块未改。DOM/CSS与environment等旧模块仍待迁移，不冒称全链strict。

## Validated

- `build.cjs --check`：16模块/17产物一致；`check-types.cjs`拒绝32个指定负例。
- 文件归属/安装失败/Context/Host/Evidence定向56项：55通过、1Windows跳过。`node --test tools/typescript/test/build.test.cjs`4/4，包括partial write、第二次rename失败回滚、权限、peer改写保留与协作锁。
- `npm test`536项：535通过、0失败、1Windows跳过。
- 源码Chrome首次运行在首项检查前失败：CDP_DISCOVERY_TIMEOUT，原日志保留。增加只读本地发现时序记录后串行诊断10/10；固定包最低Node26.0.0不加fetch包装也10/10。没有把首次失败抹掉，根因尚未确定；不能据后两次通过宣称启动不存在波动。
- 固定包322文件逐一匹配Git blob、CRC及导出集合；SHA-256`cab1fa4576d42356817217dd4c71041ea1ebd42bf290bd8d91d5788e23db1ef0`。[清单](package-c04-manifest.json)、[结果](batch-c04-results.json)。环境与[C03](BATCH_C03.md)相同；父进程显式`--no-strip-types`，无运行时TS loader。

独立静态审查未见新增阻断或实质类型谎言，未独立执行测试。

## Not validated / Known limitations

Windows、Android/WebView、真实游戏未验证。首次启动发现超时属于真实失败，后续调查应对照chrome-launch的只读准备循环，不延长业务deadline或重试副作用。源码检查与失败位置尚未指向Collector执行改变；未推断设备故障、公司策略或特定进程为根因。继续处理该准备阶段可靠性及D的浏览器边界；完整TS迁移未结束。
