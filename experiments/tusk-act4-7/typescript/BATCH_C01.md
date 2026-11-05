# TS First C01 — CDP与Integration IPC

2026-11-05。固定代码`eb8e13ad4e5ac2d1b6b10f03714a94041b339b49`，基线`f4316cccdcb1eb68d85639c669366bd287223d37`，分支`experiment/tusk-act4-7`。本轮是C的传输/IPC子批，**不是C整体或7.0完成**。

## Delivered

- cdp、integration、integration-worker纳入权威CTS和完整Program；当前7/95核心入口有strict源，8个产物含原native比较视图。
- CDP Client接口、事件回调、已知错误码及pending生命周期有类型；远端回复、事件数据与evaluate结果保留unknown，不能凭接口直接视为可信业务状态。原连接、response限额、超时分类、目标选择与不重放保持。
- Integration请求、状态、失败原因、描述和Result有类型；ProbeClient只暴露evaluate，内部关闭权不暴露给模块。保留原require/destructure捕获，保持CJS导出与Worker路径。
- 实际修复两类坏worker协议元数据：数组SHA/reason原可被正则隐式转换接受；false/0/空串/null描述原绕过真值检查。现在按实际字符串/对象校验拒绝为integration-output-invalid，合法帧、原10秒deadline及optional/Generic规则保持。
- ChromeHost仍为既有JS，worker使用明确的过渡结构接口；宿主和执行上下文继续下一子批，不冒称已全链类型化。业务Probe源码/指纹、SQLite、Session、预算、fencing和原回执未改。

## Validated

Mac无内容环境与A+B相同；独立包Chrome用最低Node26.0.0。没有游戏、设备或SDK。

| 检查 | 结果 |
| --- | --- |
| 最终运行JS的`npm test` | 532项：531通过、0失败、1Windows句柄测试跳过；最后仅扩大ErrorCode类型联合，运行体未变 |
| CDP/Inspector/Host定向 | 15/15；其中4个新增协议用例也对固定旧CJS执行，4/4通过 |
| CDP/Integration/Evidence最终定向 | 33/33，包括原文档/前后检查/超时及伪造worker元数据 |
| 完整Program与产物 | 7模块/8产物一致；CJS入口可直接消费 |
| 类型负例 | 22个预期错误：20个TS2322、1个unknown读取TS18046、1个不允许关闭ProbeClient的TS2339 |
| 固定包与实际Chrome | 321文件逐一对应Git blob，CRC/导出集合通过；最低Node26.0.0中性Chrome10/10，退出确认 |

SHA-256：`9f063b6285ad782cdf0e2e3c16324602b63e9b60ef32c57d945121032f800bea`。[逐文件清单](package-c01-manifest.json)、[脱敏结果](batch-c01-results.json)。包不含CTS/MTS或开发编译工具，不需要运行时TS loader。

复现：`node tools/typescript/build.cjs --check`、`node tools/typescript/check-types.cjs`、`node --test tests/cdp.test.cjs tests/cdp-protocol.test.cjs tests/integration.test.cjs tests/evidence.test.cjs`；独立包按原`verify-package.py`及`PAISLEY_TOOL_ROOT`运行Integration Chrome夹具，必须使用新输出目录。

## 发现与审查

数组SHA/reason和四种假值description都先由真实worker伪造JSON帧产生RED，修复后GREEN。独立审查对description指出新增类型合同不能依赖旧真值判断；修复并复核后无剩余阻断。类型验证不能代替这些运行时校验。协议回归区分未知响应、原请求归属、事件、畸形帧关闭全部pending、序列化失败不发送、response限额及protocol/page异常。

## Not validated / Known limitations

Windows、Android实机/WebView及真实游戏继续未验。旧Android未绑定Integration顺序观察语义保持，不因这次TS迁移宣称强绑定或设备通过。Worker仍非安全沙箱，终止不代表远端取消；Probe必须经本地审查且只读。任意自定义数据仍为unknown与模块作者白名单责任。

下步继续宿主/执行上下文与其真实输入边界；[整体进度](PROGRESS.md)仍列未完成模块，完整Node迁移和真实平台验收仍为7.0发布门槛。
