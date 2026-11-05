# TS First F07 — 原生业务函数与闭包归属绑定

2026-11-05。固定代码`f96881d4db07f45fa364c840e942463fe400bb98`，基线`49c0b54122e863fe1a52be28d8c3cf344882d2ac`。51原Node+8DOM strict/68产物；另2个冻结JS协议输入，共3函数体未类型化，105运行入口。

## Delivered

`game-native-business-bindings`的Node协调接入strict，Profile明确要求原`updateMoment`，远端对象ID仍unknown。`game-contract`的`retain:true`重载描述实际保留的Widget/函数宏及清理组，生成的原有运行主体未改变。

`checkBindings`函数文本参与现有衣柜/商店合同，保留为独立LF冻结JS输入；没有用TS重印、改写toString或重新计算合同结清旧Unknown。原函数摘要`fec422f5a06931db10d8aa7c2c14e5f8363ec23b268346429e1074077c0c5e41`独立固定；完整旧模块作对照，比较正常绑定、源码变化及缺少bundle的原CDP帧。原State、active、V getter、注册宏/函数及捕获函数的身份检查、调用方拥有清理组的语义保持。未修改Session、预算、Ledger/schema或恢复路径。

## Validated

- `node tools/typescript/build.cjs --check`：51Node+8DOM/68产物一致；`node tools/typescript/check-types.cjs`84指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-native-business-bindings-compatibility.test.cjs tests/game-contract.test.cjs tests/game-native-shop-operation.test.cjs tests/game-purchase.test.cjs`30/30；最低Node26.0.0源码树外固定包、自己的离线XState、父进程`--no-strip-types --experimental-sqlite`同样30/30。
- `npm test`571项：570通过、0失败、1Windows跳过；独立审查兼容/衣柜绑定/源码证明17/17。
- `node experiments/tusk-act4-7/contracts/business-bindings-verify.cjs ABS_CHROME NEW_OUTPUT`：源码Node26.13.0与最低Node26.0.0固定包，真实隔离Chrome合成闭包各6/6，清理确认。实际保留Widget、函数宏、原State和V getter；替换全局函数、getter、宏均拒绝，业务计数保持0；调用方释放组后原bundle不可使用。
- 源码探针首败来自测试表达式返回Window、无法returnByValue，已将修改表达式显式改为void；最终保留`window`拒绝/`void window`成功的负对照。没有放宽生产CDP检查。
- ZIP353文件逐一匹配Git blob/CRC/export集合，SHA-256`ad11d28444bed81727c313455d09c8bd4817dcf57589803d5c7e3a56e091aacc`。[清单](package-f07-manifest.json)、[结果](batch-f07-results.json)。环境为macOS ARM64、Chrome156；不包含游戏资源或设备数据。

## 最低Node浏览器首败与诊断

固定包首次启动以`PC_DOCUMENT_CHANGED`拒绝，尚未返回`pc.start`、未进入业务检查。只读CDP诊断再次复现：同一精确目标约5秒内92次帧快照URL均为空，默认上下文origin为`://`，尚未建立文档绑定。这些分支早于本批binder调用；F07没有修改ChromeHost/launcher/HTTP实现。保留首次日志、独立Profile与诊断记录于本地忽略目录，不上传原始浏览器输出。

后续增加HTTP/事件观测时，本地首页和fixture均200，空文档正常进入目标文档，6项通过；未发生clientError或Network.loadingFailed。该观测曾安装clientError监听，可能改变该事件出现时的默认处理，因此它只作为诊断证据。最终撤除全部诊断钩子，用同一固定包和新的独立Profile执行原脚本，6项通过、清理确认。原失败的owned进程已不存在，原HTTP端口已关闭。

目前只能将已观察到的失败定位为**绑定前初始文档未就绪**；物理触发原因未定，不能宣称是Node、HTTP、GPU或管理策略故障，也不能把后续通过称为启动稳定性修复。没有延长超时、重新导航、替换目标、自动重试业务或放宽身份条件。首败与复现继续作为待调查的启动可靠性限制；本批业务绑定功能通过，启动可靠性没有获得普遍验收。

## Not validated / Known limitations

Windows、Android/WebView、真实DoL未验证；本轮没有执行真实业务。冻结JS函数不是typechecked DOM源，必须继续用原文、摘要及帧对照守住合同。偶发绑定前启动超时的物理原因仍Unknown，失败时原安全拒绝保持。其余Runtime/Provider/CLI迁移继续，51/95不代表7.0发布门槛完成。
