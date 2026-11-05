# TS First F05 — 授权、原生资源与固定操作目标

2026-11-05。固定代码`bbe2b0475afc8a5d775477db1c3820027e818bdd`，基线`70c5a3325a2423ec6d78fcc04cda09ec61cbc172`。49原Node+7DOM strict/64产物，另1个冻结JS协议输入（2函数体未类型化），103运行入口。

## Delivered

game-scope和game-resource接入strict。Android/Chrome授权联合保留各自字段与dataDomain，原生Facts、不同kind的Proof、维护Runtime与事件明确；phantom brand帮助作者避免伪造，但实际门槛仍是原WeakSet+kind、资源generation/attempt。Proof只声明原Object.freeze的浅只读，不声称深冻结或Node沙箱。

四项实际故障注入/边界修复：Scope身份数组/String对象旧可被正则强制转换接受，现要求primitive string，validate固定返回boolean（null等旧falsy返回值改false）；Android assertTarget拒绝Chrome scope，防缺省undefined字段互相匹配；原生inspect拒绝可强制转换的target字段且不查询ADB；私有nativeTarget逐字段捕获身份，identity/snapshot沿inspect的私有目标，rebuild在向proof/runtime/record暴露before前另复制操作目标，后续force-stop/clear/marker/复核均使用该副本。

旧交错用例在调用者改变target后安全拒绝，未观察到实际错误清除；新实现保持最初选定身份，不追随调用者跨await的修改。旧非primitive授权正常路径另有canonical target检查，不把合成直接API问题夸大成实机越权。四项回归先在旧CJS失败，再通过；有效JSON身份、命令顺序、Unknown/原回执、fencing、marker与schema保持，未清理任何历史效果。

## Validated

- `node tools/typescript/build.cjs --check`49Node+7DOM/64产物一致；`node tools/typescript/check-types.cjs`77指定负例（含不能结构伪造带来源的Proof）；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-scope.test.cjs tests/game-resource.test.cjs tests/chrome-gameplay.test.cjs tests/game-goal.test.cjs`66/66，真实临时SQLite与ADB替身。原生代次重建、不同user/secondary writer、失败保留围栏、旧Unknown不改变，以及调用者变更时的身份捕获保持；未运行任何真实ADB指令。
- 独立协议审查实际运行Scope/resource12/12，核对所有后续run-as/clear目标均沿私有副本，未发现可证实新增协议回归。
- `npm test`566项：565通过、0失败、1Windows跳过。源码真实隔离Chrome GER/Evidence13/13，Chrome授权、预算与原未决恢复保持。
- 源码树外固定包按锁离线安装自有XState，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同66项通过，真实Chrome GER13/13。
- ZIP347文件匹配Git blob/CRC/export集合，SHA-256`9cfe25ab0764980c0aa1de81a00422da6d11db3112f892000a3d917426069c03`。[清单](package-f05-manifest.json)、[结果](batch-f05-results.json)。Mac环境同F04，全部无游戏合成内容。

## Not validated / Known limitations

Windows、Android设备/WebView与真实游戏未验证；ADB替身不证明原生命令、系统权限或真实App数据代次。原生资源现场记录保持原本的调用者拥有行为，不自动公开原始stdout/stderr。已知缺设备、SDK/APK工作留Windows，不因本批模拟通过推进实机声明。Runtime/Provider/CLI等其余迁移仍继续，49/95原Node接入不代表7.0完整门槛完成。
