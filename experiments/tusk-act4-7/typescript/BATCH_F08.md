# TS First F08 — 衣柜与商店原生准备协调

2026-11-05。固定代码`6a357bfbf8a9400638d269deda4a0d2363740a84`，基线`00a616b991e0e74d0f1fd981fef792436790120c`。53原Node+8DOM strict/70产物，另3个冻结JS协议输入共7函数体未类型化，106运行入口。

## Delivered

`game-wardrobe-native`与`game-shop-native`的Node准备、原生依赖绑定、guard编译核对、回执binding和清理协调接入strict。类型区分仅attest返回与可执行reviewedOperation；raw页面snapshot、原生对象ID仍unknown。尚未迁移的JS producer通过局部有限端口描述实际字段，不把端口当作新增运行时验证。原延迟require、预算/Scope的下游检查、原异常与清理失败语义保留，没有执行、重派或结清任何Unknown。

商店`branch/readCurrent/dateGetterOf/sourceCheck`的文本参与既有合同，原样保留为LF冻结JS输入。四个函数的固定旧模块、独立LF摘要、完整准备帧/编译guard/操作源码/合同摘要进行对照；没有TS重印浏览器合同、替换toString或修改旧回执身份。衣柜依赖的原reader/branch仍由其既有JS producer提供，后续迁移另验，不冒称已类型化。

## Validated

- `node tools/typescript/build.cjs --check`53Node+8DOM/70产物一致；`node tools/typescript/check-types.cjs`89指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-native-preparation-compatibility.test.cjs tests/game-native-shop-binding.test.cjs tests/game-native-wardrobe-binding.test.cjs tests/game-native-shop-operation.test.cjs tests/game-wardrobe.test.cjs tests/game-purchase.test.cjs`26/26；源码树外固定包、自有离线XState、最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同样26/26。
- 新兼容测试以固定旧实现对照2×10种合成模式：完整准备、仅attest、save分支、源码/预检拒绝、mapping失败、清理失败与快照缺失等。实际构造出的guard、operation及binding摘要和CDP/释放帧逐项一致；既有VM检查保留时钟/getter归属、变量匹配、分支拒绝与无CDP前拒绝。独立审查运行9/9并检查JS端口与原清理语义。
- 新测试首跑缺少`Runtime.releaseObject`替身，导致商店仅attest测试不能到达成功断言；只修测试替身，未改生产行为。全套首次受限运行574项中571通过、2项回环listen EPERM失败、1Windows跳过；使用允许本地回环监听的权限运行同一代码后，`npm test`574项中573通过、0失败、1Windows跳过。保留首败日志。
- 最低Node26固定包真实隔离Chrome GER/Evidence13/13，覆盖已有合成购买、SQLite中断/原Unknown恢复、目标变化拒绝与Evidence。这是既有共享GER路线的回归，不证明本批原生商店/衣柜执行已在真实游戏中通过。
- ZIP357文件逐项匹配Git blob/CRC/export集合，SHA-256`0c255807b94d22f08acee649c6e3e9c03cadc0f37b036d1c04449452a60d9ff6`。[清单](package-f08-manifest.json)、[结果](batch-f08-results.json)。macOS ARM64、Node26.13.0/26.0.0、Chrome156，全部为自写合成数据。

## Not validated / Known limitations

Windows、Android/WebView、真实DoL、真实原生商店购买和衣柜操作未验证。prepare对照使用合成producer/CDP替身，VM浏览器检查也不替代真实业务验收。冻结的7函数体未类型化；原生JS producer的后续迁移不能因本批端口通过而跳过其实际边界验证。[F07](BATCH_F07.md)观察到的偶发绑定前空文档超时仍保留，物理原因未定，本批未修改启动路径。

本批在上述范围达到Scoped Done，完整Node核心迁移仍未完成；53/95不代表7.0可发布。
