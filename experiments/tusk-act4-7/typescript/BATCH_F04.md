# TS First F04 — Goal条件、报价与持有原回执的完成判断

2026-11-05。固定代码`1c2b27ada8c2e44bd1508a3204b8eee4302a504c`，基线`769422ede5def0fabaabd31db2572bd050bf4458`。47原Node+7DOM strict/62产物，另1个冻结JS协议输入（2函数未类型化），103运行入口。

## Delivered

game-goal-reader的Node请求/预算、报价、购买回执与完成判断接入strict；原游戏状态读取移至独立DOM-only Program。Goal联合区分到达、装备、条件装备、购买、购买并装备；旧coercive name/装备slot仍为unknown。报价仅在实际校验后成为Quote；浏览器原始item/nonce/turns等不伪称完整已验证状态，JSON解析的variant保留unknown。保留0/null预算、精确variant、原nonce与合同、已settled效果，浏览器状态匹配不能单独完成purchase-and-equip。

独立审查实际复现继承Goal字段通过检查后被JSON克隆丢弃，却承诺完整Request。新增继承root/goal/budget及继承toJSON抹字段4类回归先RED。现复用同一私有规则，先按原顺序校验原输入，JSON克隆一次，再校验实际返回数据，基于克隆Goal设置purchase-one默认maxSpend=null。没有递归、重读原getter/toJSON或新的执行层；审查静态复核确认收口，未独立重跑77项测试。

## Validated

- `node tools/typescript/build.cjs --check`47Node+7DOM/62产物一致；`node tools/typescript/check-types.cjs`74指定负例；`node --test tools/typescript/test/build.test.cjs`5/5（本批相同构建配置，无重复计数）。
- `node --experimental-sqlite --test tests/game-goal-reader-compatibility.test.cjs tests/game-purchase.test.cjs tests/game-goal.test.cjs tests/game-native-shop-operation.test.cjs tests/game-spend.test.cjs tests/game-shop.test.cjs`77/77。5类Goal×6状态/DOM共30旧观察，6规范化和5报价与固定旧自有实现一致；4类克隆丢字段拒绝。既有真实SQLite合成Ledger/业务断言继续通过。
- `npm test`560项：559通过、0失败、1Windows跳过。
- `node experiments/tusk-act4-7/contracts/goal-proof-verify.cjs ABS_CHROME NEW_OUTPUT`真实隔离Chrome8/8、清理确认。读取自写状态与真实DOM，检查不一致/多Passage拒绝、装备条件、正支出/精确库存、超支拒绝、无settled receipt不能完成联合目标，观察不调用业务函数。
- 源码树外固定包按锁离线安装自有XState，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`定向77/77；`PAISLEY_TOOL_ROOT`指向独立包，真实Chrome Goal条件8/8、清理确认。
- ZIP346文件匹配Git blob/CRC/export集合，SHA-256`d52a603c0d5dd7e74a55527015d1c7d8853486a01c0303a709e231320eb2da2c`。[清单](package-f04-manifest.json)、[结果](batch-f04-results.json)。Mac环境同F03，只有无游戏合成内容。

## Not validated / Known limitations

Windows、Android设备/WebView、真实游戏未验证；自写State stand-in和DOM没有实现DoL引擎。新增实际Chrome脚本是本批实验入口，不能作为Windows已通过保证。预算/回执生产合同未改，Store/schema/旧Unknown未迁移或清理。Typed Goal authoring不表示所有Provider均实现所有Goal。其余核心Runtime/Provider/CLI等迁移仍继续，7.0整体门槛尚未完成。
