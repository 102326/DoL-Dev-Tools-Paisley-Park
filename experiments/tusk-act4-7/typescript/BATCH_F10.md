# TS First F10 — 原生控件与导航的来源归属

2026-11-05。固定代码`325a08301a53cf6f172173b8791f6d0c29b8bd59`，基线`f575bdfcd769aaad4762204acde4b84d14253658`。57原Node+8DOM strict/74产物；另6冻结JS协议输入共11函数体未类型化，109运行入口。

## Delivered

`game-native-control`与`game-native-navigation`的Node闭包查找、原控件证明、环境检查、来源复核、操作准备和清理协调接入strict。控件成功证明明确`actions:false/terminalReviewed:false`；lexical值、远端对象ID及prepare返回的selected Action保持unknown，交由原下游所有者验证。衣柜/商店改用权威control类型，移除对应临时端口。

类型检查揭示导航准备的真实接口需要：原`receipts.context`使用evaluate。现区分send-only的证明/lexical Client与send+evaluate的ExecutionClient；只读阶段不增加执行方法。运行顺序、环境参数的原校验、原合同摘要、History/save见证、原组归属与复合清理失败保持。没有新授权、执行或结清Unknown，未改变Store/schema/预算/目标合同。

原`clickReader`文本参与原生guard，保留LF冻结JS输入；固定原摘要`b76bd7be310680c70a97166db9147891e36a23a0c8fae84bfd727abbd632e72b`及两完整旧模块对照。其余未迁移的history/save/operation生产者仍明确列为待办，不因有限端口存在而冒称typechecked。

## Validated

- `node tools/typescript/build.cjs --check`57Node+8DOM/74产物一致；`node tools/typescript/check-types.cjs`99指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-native-control-compatibility.test.cjs tests/game-native-navigation.test.cjs tests/game-native-control.test.cjs tests/game-navigation-operation.test.cjs tests/game-native-preparation-compatibility.test.cjs tests/game-clothing-mapping-compatibility.test.cjs tests/game-native-save.test.cjs`52/52；最低Node26.0.0源码树外固定包、自有离线XState、父进程`--no-strip-types --experimental-sqlite`同样52/52。
- 新差分逐项比较8种control和15种navigation模式的全CDP/guard/operation/binding摘要/清理，包括null callback、monitor、scene、save、额外生命周期任务、参数拒绝和复合失败。使用合成contract/profile/crypto替身，验证协调合同相同，不把它算作真实源码指纹验收。独立审查运行10/10。
- `npm test`582项：581通过、0失败、1Windows跳过，含既有临时SQLite、未决恢复与围栏回归。
- `node experiments/tusk-act4-7/contracts/control-verify.cjs ABS_CHROME NEW_OUTPUT`源码真实Chrome6/6，最低Node26.0.0父进程`--no-strip-types`固定包同样6/6，清理确认。真实V8的State闭包与原State对象一致，primitive值真实读取，missing name拒绝；原事件reader找到真实DOM的原handler，额外handler拒绝，业务计数0。释放组后核对指定对象归属错误，且同一绑定会话仍能正常读取，排除将断线误算为对象释放的假阳性。
- 探针首轮最后一步仅断言任意异常，审查后收紧为指定归属错误加同会话读取；保留原记录，最终源码与固定包使用收紧版。它不调用handler，也不替换生产profile或宣称原生游戏来源证明已通过。
- ZIP366文件逐一匹配Git blob/CRC/export集合，SHA-256`96b4b39e29a040e62589ddc55ba19bb8fd5d1156414bb0f217c3868796f07968`。[清单](package-f10-manifest.json)、[结果](batch-f10-results.json)。macOS ARM64、Node26.13.0/26.0.0、Chrome156，无游戏资源、设备或正式Store。

## Not validated / Known limitations

Windows、Android/WebView、真实DoL、原生游戏源码profile的真实attestation及业务执行未验证。真实Chrome仅证明合成页面上的V8闭包、对象归属和事件读取；合成的协调对照不能取代真实引擎业务验收。11个冻结函数体未类型化，History/save/operation及Runtime等迁移仍继续。[F07](BATCH_F07.md)的偶发绑定前空文档超时物理原因仍未定，没有靠重选页面或放宽身份条件处理。

交接清单同步纠正此前game-contract、goal-reader、business-bindings三个已迁移模块残留的“待迁移”行，并补全新增冻结输入；以Program、固定报告和完整运行入口清单共同核对，不按旧表重复开发。本批达到上述Scope的Done，57/95仍不满足7.0完整迁移和发布门槛。
