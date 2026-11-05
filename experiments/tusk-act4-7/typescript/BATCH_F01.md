# TS First F01 — 意图、支出与原生调用合同

2026-11-05。固定代码`0c48af184cb23714861f4c2a1fccb42712d5a3cf`，基线`d8caaff27b8a2bac9a83ed052c23c775232dcaea`。44原Node+5DOM strict/55产物，100运行入口，完整GER迁移仍继续。

## Delivered

game-semantic、game-spend、game-native-invocation接入strict。冻结意图数组导出派生类型，不声明每个Provider均支持。支出输入从unknown验证，null是明确无限制，undefined组合默认null，零预算保持；没有JS强制转换放宽。原生绑定只使用原控件数据描述符与原click源码，保留原错误和cleanup错误的AggregateError。

仍为JS的game-contract桥按真实返回保守声明：functionSource确实校验字符串，member仅检查truthy，因此Binding标识保留unknown，不冒充已验证string。后续协调器与边界继续迁移，未新增运行时封装。独立只读审查未发现新增阻断或具体类型问题，未独立运行测试。

## Validated

- `node tools/typescript/build.cjs --check`44Node+5DOM/55产物一致；`node tools/typescript/check-types.cjs`66指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --test tests/game-spend.test.cjs tests/game-semantic.test.cjs tests/game-native-invocation.test.cjs`19/19。已有预算与语义测试复用；新增cleanup双错误断言在原实现和生成实现均通过，属于保持性覆盖。
- `npm test`552项：551通过、0失败、1Windows跳过。源码真实隔离Chrome GER/Evidence13/13，预算、原pending恢复、目标变更拒绝与标准Evidence保持。
- 源码树外固定独立包按锁离线安装自有XState，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同19项通过。
- ZIP338文件匹配Git blob/CRC/export集合，SHA-256`3fcfa117792b84f0f4c7aa1c65fe40a2deadc5c9182d59a4b2d624b1b7fb987d`。[清单](package-f01-manifest.json)、[结果](batch-f01-results.json)。Mac环境同E09，全部合成内容。

## Not validated / Known limitations

Windows、Android设备/WebView、真实游戏未验证。没有改变Session/预算/Effect Ledger/fencing/Unknown/原回执合同或schema，没有清理旧未决；原生objectId桥仍有历史弱类型检查边界，不能把接口unknown视为验证成功。核心GER/Store/Provider与业务浏览器源码摘要所有者继续迁移，本批不代表F完成。
