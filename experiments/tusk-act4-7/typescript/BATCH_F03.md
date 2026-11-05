# TS First F03 — 源码证明、原对象持有与协议失败

2026-11-05。固定代码`1f966b6089184a6adfc6c2c7642e900b4f985778`，基线`9be128d297fdcfa6b60270bf0bd4e91127b9aba7`。46原Node+6DOM strict/59产物，另1个冻结JS协议资产（2函数未类型化），102运行入口。

## Delivered

game-contract迁strict，Widget/FunctionMacro、包装链联合、捕获限制、实际客户端/结果有界类型；invocation/render消费者改用真实模块类型。member/captured原只检查truthy的远端ID继续为unknown，functionSource/sameObject才声明实际检查的string/boolean，不把内部属性访问视图当成CDP帧验证。loadedWidget只读Story探针移至DOM-only Program；只有此观察表达式打印预期变化，实际摘要输入仍为捕获的widgetCode/function source，F02原render摘要保持。

实际故障注入确认一个旧问题：两类attestation用failure真值判断，协议以undefined/null/false/0/空串拒绝时会正常resolve(undefined)，只await的调用方可能继续。旧固定实现和迁移初版均复现；两个用例先RED。改为独立failed标志，始终尝试原组清理，成功后原样reject，清理也失败则聚合[原拒绝值,清理错误]与原错误码。retain只在无失败且证明完成后返回原对象；此后返回类型不再包含被吞失败的undefined。没有自动重试或变更Store/Session/Ledger/回执。

独立协议审查初次16/16，修复后合同13/13（含40故障组合），确认清理/保留语义与返回类型一致。本次没有观察到真实CDP产生falsy拒绝，故障来源明确是合成注入。

## Validated

- `node tools/typescript/build.cjs --check`46Node+6DOM/59产物一致；`node tools/typescript/check-types.cjs`71指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --test tests/game-contract.test.cjs tests/game-native-invocation.test.cjs tests/game-native-time.test.cjs tests/game-native-render-tasks.test.cjs tests/game-native-render-source-compatibility.test.cjs tests/game-navigation-operation.test.cjs tests/game-native-profile.test.cjs`61/61。9种固定旧正常/失败/retain/包装链结果、拥有的group与其他协议帧一致；打印变化的只读Story表达式在fixture实际执行后比较证明结果。两个API×5拒绝值×2retain×2cleanup共40故障组合通过。
- `npm test`557项：556通过、0失败、1Windows跳过。
- `node experiments/tusk-act4-7/contracts/verify.cjs ABS_CHROME NEW_OUTPUT`真实隔离Chrome7/7、清理确认：实际V8闭包/definition payload/唯一Story body、原对象持有至组释放、innermost函数捕获、重复/变化Story与变更函数拒绝，业务函数调用次数为0。
- 源码树外固定包无node_modules，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`定向61/61；`PAISLEY_TOOL_ROOT`指向独立包，同contracts/verify.cjs真实Chrome7/7、清理确认。实验夹具脚本来自固定源码提交且按原规则不进入运行ZIP。
- ZIP343文件匹配Git blob/CRC/export集合，SHA-256`b4e41145cb2d7844e49548f1372c0c53f1b29b79db1bfbba3a3bf7ebcfbffe5e`。[清单](package-f03-manifest.json)、[结果](batch-f03-results.json)。Mac环境同F02，无游戏内容或设备。

## Not validated / Known limitations

Windows、Android设备/WebView、真实游戏未验证。真实Chrome使用自写合成Widget/function闭包，并非DoL引擎或真实Mod源码验收；仍需Windows既有代表业务与原回执恢复。不承诺所有远端JSON均已完整验证，opaque objectId历史检查边界保留。F02冻结JS函数体仍未TS检查；其余Node核心、Provider、Runtime、CLI及开发工具继续迁移，完整7.0门槛未完成。
