# TS First C02 — 宿主与执行生命周期

2026-11-05。代码`7d0d91baface643efa43a18cbde9248858905624`，基线`b0636092008a6c0e34baea23ae658e8e4888bb4f`。本轮不是C整体或7.0完成。

## Delivered

ChromeHost与execution-context接入strict完整Program；共9/95核心入口、10生成产物。CDP结果与外部事件保留unknown；Android原raw transport由Context管理，bound facade仅提供受约束send/evaluate/assertBound，不授予连接关闭权。Chrome与worker直接消费权威宿主类型，保留lazy require和旧捕获时机。

浏览器身份的Browser及socket字段拒绝数组隐式转换；Chrome contextCreated拒绝标量。新增PC_BROWSER_METADATA_INVALID定位至pc.browser，不推断设备或进程故障。畸形frame元数据在已有绑定上锁存失效，后续正常读数不能复活旧holder；独立审查发现该分类与锁存不一致后先RED再修复为GREEN。

原Android serial/package/userId、forward所有权、deadline、反向清理、no reconnect、完整documentURL与unique context约束保持；未改业务Probe源码指纹、数据库schema、Session、预算、fencing、Unknown、原回执及恢复规则。

## Validated

macOS27.0.1 ARM64、Node26.13.0、Chrome156.0.8078.73；独立包使用最低Node26.0.0。仅合成内容。

- `node tools/typescript/build.cjs --check`：9模块/10产物一致；`check-types.cjs`拒绝26个指定负例，含raw host结果不可直接读value、bound client不能close、Context必须提供生命周期成员。
- `node --test tools/typescript/test/build.test.cjs`：4/4。相关Action/Journey/Context/Host/Gameplay/Integration定向64/64；随后新增frame锁存用例，最终Host7/7。
- `npm test`：535项，534通过、0失败、1Windows跳过。首次沙箱执行有2项回环listen EPERM，获授权运行后全部适用测试通过；未将环境失败记为通过或反复重跑掩盖flaky。
- 源码真实隔离Chrome GER/Evidence13/13：含真实SQLite pending、SIGKILL恢复、不重复购买、关闭Session核对原terminal、URL ABA/reload/fencing、标准Evidence/Known Good/Compare。
- 固定提交ZIP的321文件逐一核对Git blob、导出集合和CRC；最低Node26.0.0加`--no-strip-types`父进程执行独立包Chrome Integration10/10，退出确认。运行不需要CTS或tsc；未宣称所有子进程继承该flag。

ZIP SHA-256：`69f03bc2adc3eb14e2aee3dd839a510727abc1a56cc5ae53fe9b19e608cb40cd`。[逐文件清单](package-c02-manifest.json)、[脱敏结果](batch-c02-results.json)。真实Chrome脚本沿用`experiments/tusk-act4-7/ger/verify.cjs`和`integration/verify.cjs`，输出需新目录。只读独立审查复核后无剩余阻断；它没有独立执行测试。

## Not validated / Known limitations

Windows、Android/WebView真机、真实游戏未验证。类型断言未替代运行时授权；Android旧Integration的顺序观察合同不自动成为强绑定。Worker仍非安全沙箱，超时/终止不保证远端取消。完整迁移仍是7.0发布门槛；继续C的启动/HTTP/宿主输入等模块，不以当前9模块宣称全仓strict。
