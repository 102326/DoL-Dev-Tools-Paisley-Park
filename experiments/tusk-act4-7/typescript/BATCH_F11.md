# TS First F11 — History、存档观察与环境协调

2026-11-05。代码`6bc4f6a62375a6758ad571fb8326bfd250c64859`，基线`5f00df3afc1b1e7f1da76c060e6898dced7a3f5a`。60原Node+8DOM strict/77产物，另9冻结JS输入共23函数体未类型化，112运行入口。

## Delivered

History来源绑定、save授权/实现复核/见证投影、environment inventory协调接入strict，消费者改用真实生产类型。原12个摘要敏感函数保留为3个LF原文输入；Node协调迁移不重印浏览器合同。`save.receipt`在旧non-save路径可返回原始r/e，故两者仍unknown；`validateEvidence`保留旧falsey返回，亦未冒称boolean或已验证Evidence。FlagsMatch只有原检查`===true`才接受。

History/save/环境的原别名、源码、组归属、存档观察器、原digest和延迟require保持；未更改Store/schema、Session、预算、Unknown或重放语义。固定旧模块和独立LF摘要覆盖新增12函数，私有saveFlagsMatch也由独立审查从旧模块核对原文。

## Validated

- `node tools/typescript/build.cjs --check`60Node+8DOM/77产物一致；`node tools/typescript/check-types.cjs`106负例；`node --test tools/typescript/test/build.test.cjs`5/5。负例首跑将原始投影访问的TS2571误归到TS18046，已按实际编译诊断纠正测试预期，没有修改生产行为。
- `node --experimental-sqlite --test tests/game-native-witness-compatibility.test.cjs tests/game-native-environment.test.cjs tests/game-native-save.test.cjs tests/game-navigation-operation.test.cjs tests/game-save-recipe.test.cjs tests/game-native-control-compatibility.test.cjs tests/game-native-preparation-compatibility.test.cjs tests/game-native-navigation.test.cjs tests/game-clothing-mapping-compatibility.test.cjs`60/60；最低Node26.0.0树外固定包、自有离线XState、父进程`--no-strip-types --experimental-sqlite`同样60/60。
- 新旧对照5种History、5种save、6种environment完整帧/guard/digest及旧falsey/投影；既有VM覆盖原存档提交、超时、原位恢复、业务尾部与未决保留。独立审查实际18/18；history由兼容测试覆盖，没有把不存在的专属测试文件计为执行。
- `npm test`586项：585通过、0失败、1Windows跳过，含既有临时SQLite恢复/围栏。
- `node experiments/tusk-act4-7/contracts/save-observer-verify.cjs ABS_CHROME NEW_OUTPUT`源码与最低Node26固定包真实Chrome各5项通过：实际IndexedDB abort保持同一合成pending并回滚、真实事务完成和独立读取、无写入零计数、原add描述符/Hook恢复、业务计数0。仅使用自写存储owner，未替换生产profile，也不将合成terminal称为真实Ledger。
- 探针审查后分离observerCleanup/browserCleanup，避免浏览器关闭冒充原位恢复。`--fault-restore`定向注入恢复冲突，实际读取注入标记true，预期退出1、observer/整体unconfirmed、browser confirmed；这是通过的负对照，保留初始记录。最终正向源码/包两种清理均confirmed。
- ZIP373文件对应Git blob/CRC/export集合，SHA-256`8c552be97a15925f0fc275b16178ef1950b05910130aab1774cf5a18bf22a8dc`。[清单](package-f11-manifest.json)、[结果](batch-f11-results.json)。macOS ARM64、Node26.13.0/26.0.0、Chrome156，无游戏资源或设备。

## Not validated / Known limitations

Windows、Android/WebView、真实DoL、原生游戏存档profile/真实业务验收未验证。真实IndexedDB探针直接调用原观察器，生产profile复核仍由合成帧/既有测试覆盖；不能将二者合并为原生游戏存档验收。23函数体为明确原文协议角色，未类型化。[F07](BATCH_F07.md)初始空文档偶发超时物理原因仍未定。

本批合同范围达到Scoped Done，完整迁移继续；60/95不是7.0发布完成。
