# TS First F02 — 保留浏览器源码ABI的原生render协调

2026-11-05。固定代码`067d6b5a47e8c0ef91202671f37db3524de33a07`，基线`abae044e037fa57813c7ab78af365b5de437dc45`。45原Node+5DOM strict/56产物；另1个明确冻结JS协议资产（2个函数体未受TS检查），101运行入口。

## Delivered

game-native-render-tasks的Node bind协调接入strict。实测普通TS打印会改变check/finish函数文本，进而改变既有render digest。因此将这两个函数原样作为scripts/lib/browser-abi/native-render-tasks.cjs协议输入，不编译、不替换Function.toString、不新增eval执行层；Node只把它们作为原协议源码使用，返回保守unknown。没有把JS函数体计入strict browser数，也不把Node协调迁移宣传成其算法已类型化。相比另建保留空白的编译器，这直接复用原函数，未引入工具运行依赖。

独立协议审查发现原换行敏感性可能使新旧同机对照共同漂移，现对ABI/oracle显式Git text eol=lf，并从固定基线Git blob钉住原LF render digest。旧CRLF checkout回执仍保持旧身份，不能根据新摘要自动迁移、结清或重派；需要其原兼容恢复基线。保持原digest/帧/exports和前置拒绝，没有改Store、Ledger或receipt合同。

## Validated

- `node tools/typescript/build.cjs --check`45Node+5DOM/56产物一致；`node tools/typescript/check-types.cjs`68指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。Program检查本身不验证冻结JS；下述保持性测试负责该边界。
- `node --test tests/game-native-render-tasks.test.cjs tests/game-native-render-source-compatibility.test.cjs tests/game-navigation-operation.test.cjs tests/game-native-profile.test.cjs`40/40。
- 两函数toString逐字相同，所有实际bind帧/参数/结果/digest与固定旧自有实现一致，包括metadata、bundle、preflight三类拒绝。绑定函数替换和CRLF内存模块为负对照；固定原LF digest为`f796e657ba5fa87891932226fdbae629827405e15a3b77c51986dfcce55ed7ba`，不会因两边一起转行掩盖漂移。
- 独立审查实际运行初次28/28、换行修复后2/2；独立从基线Git blob核对固定digest一致。其首次辅助Module._compile探针filename设置错误导致Node断言，后改隔离VM完成换行实验，不是产品测试失败。
- `npm test`554项：553通过、0失败、1Windows跳过。源码树外固定包无node_modules，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同40项通过。
- ZIP341文件匹配Git blob/CRC/export集合，SHA-256`7fd09f9eb8d7513f0c5d16c0ea4f60859c85d2a3039d4e5866e12e1ab33ac392`。[清单](package-f02-manifest.json)、[结果](batch-f02-results.json)。Mac环境同F01，无游戏内容或设备。

## Not validated / Known limitations

本批未新跑真实Chrome；既有DOM/原生协调协议的保持性由固定源码/真实帧构造及合成VM测试观察，不能替代真实SugarCube Engine生命周期。Windows实际检出、Android/WebView、真实游戏仍未验证；尤其需检查LF检出与历史CRLF绑定的实际恢复拒绝。冻结JS算法没有TS检查，属于明确协议输入例外，不能被当前部分迁移数量掩盖。其余Node核心与浏览器摘要所有者继续逐项处理，7.0仍未满足完整迁移门槛。
