# TS First E04 — Action派发与受审查操作合同

2026-11-05。代码`a443698a30839a8b3dbce8f659d0bf0186e34430`，基线`4da8b6fb0da4c126e5347c0dd65f00bd48360a0f`。新增Action权威CTS，PC capture直接消费；31Node+3DOM/38产物，仍非整体完成。

## Delivered

- Action使用分支互斥的JSON联合类型、有限Summary/Completed、WebGuard/Operation与未知CDP结果视图。Completed仅代表旧Action派发结果，不代表业务Goal完成。受审查Operation的冻结源通过readonly类型反映，运行时权限仍由原private WeakSet/本地审查决定，类型不是授权机制。
- 实际修复动作type的非字符串强制转换：String对象和可转换对象原可进入字段合同，现按ACTION_INVALID/action拒绝；原合法字符串不变，新负例先RED后GREEN。
- 保留markSideEffect/markOperationDispatch、原guardRejected/notDispatched规则、callable+receiver绑定、CDP错误脱敏、Android用户/前台/数据代次/旋转恢复和连接所有权。未加重放、清空pending、变更旧receipt、schema、预算、fencing或recovery。
- CJS导出与require捕获保持。新增固定旧自有模块作为测试oracle，五种普通/guarded input/未获来源/WeakSet-reviewed/invocation的真实派发JavaScript、CDP参数和结果逐字相等，不只比较动作名称。

## Validated

| 检查 | 实际结果 |
| --- | --- |
| Program/生成物 | 31Node+3DOM、38产物一致；固定提交后再核对通过 |
| 类型负例 | 48个指定错误；含input必填value、native不可携带selector、不能将Ack称为verified、冻结源不可赋值 |
| Action/Context/Journey/Chrome定向 | 52/52；五种派发源码/参数固定旧对照均一致 |
| 构建故障/边界保护 | 5/5 |
| `npm test` | 545项：544通过、0失败、1Windows跳过 |
| 特殊独立审查 | 15/15定向实际执行；确认旧fixture字节匹配基线；类型分支过宽问题经Closed联合与编译探针修正，无已证实的新派发回归 |
| 源码真实Chrome | GER/Evidence13/13，真实合成SQLite与子进程中断/恢复 |
| 最低Node独立包 | 源码树祖先之外新解压，原锁定XState离线安装、包内解析已确认；Node26.0.0父进程`--no-strip-types`GER/Evidence13/13 |

Chrome场景包括真实一次购买状态变化、原document/closure对象、URL ABA/reload、SIGKILL后原terminal结算且不重复购买、Profile pending fence、标准Evidence/Known Good/Compare；不是游戏业务实机证明。审查方测试在最后纯类型修正前执行，最后生成物/源码及包Chrome由主代理核对。

固定ZIP332文件逐一匹配Git blob、CRC及export集合；SHA-256`c56a5595f1a57dcae673c0fca7d56d709f71c9e87dd416453f772ae56a72cfb3`。[清单](package-e04-manifest.json)、[脱敏结果](batch-e04-results.json)。复现沿`tools/typescript/README.md`和原`ger/verify.cjs`，需要新输出目录。Mac环境同此前各批，未访问私人Store或游戏资源。

## Not validated / Known limitations

Windows、Android真机/WebView与真实游戏未验证。标准TS CJS带strict模式；审查未发现实际受支持可变Context路径的回归，不保证任意非JSON继承/非枚举对象等外部调用者获得JSON合同。运行时原校验与private来源检查继续必要。其余Journey/Evidence/CLI主体、原生浏览器源码和GER迁移继续，完整Node发布门槛未完成。
