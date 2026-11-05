# TS First F12 — 原生接收器源码载体与持久合同保持

2026-11-05。代码`6fc3657124118b0298ecafdb50ecdcc764030bb7`，基线`a9ae52d40bd80db9b8b57e28b493f57a503da927`。69原入口的CTS接入strict，其中9项是本批源码载体，不能称其浏览器函数体已类型检查；另8DOM源，86产物，14冻结JS输入共36函数体未类型化，117运行入口。

## Delivered

Daily/garden/hall/hour/street五个有限接收检查，以及navigation/shop/shop-menu/wardrobe四个operation模块，原作用是向浏览器提供函数源码。其13个正文参与native-profile guard或持久执行合同，按原JS协议输入保留：五个状态模块合并为一个冻结资产，四个操作资产各自保留。CTS只提供toString接口，禁止把浏览器函数当成Node执行器；消费者改用真实source owner类型。

没有借类型迁移重印旧合同、重哈希结清Unknown或重放动作。navigation operation的模块级require改为指向相同history模块的相对路径，原default preflight/checkHistory闭包及所有函数正文保持；导出键、函数name/length亦保留。原始JS输入是计划明确的协议角色，不是可调用Node业务体的无检查替代品。

## Validated

- `node tools/typescript/build.cjs --check`69Node入口+8DOM/86产物；`node tools/typescript/check-types.cjs`109指定负例，含两个TS2349证明不能在Node直接调用载体；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-source-carriers-compatibility.test.cjs tests/game-native-daily-state.test.cjs tests/game-native-garden-state.test.cjs tests/game-native-hall-state.test.cjs tests/game-native-hour-state.test.cjs tests/game-native-street.test.cjs tests/game-navigation-operation.test.cjs tests/game-native-shop-operation.test.cjs tests/game-native-wardrobe-operation.test.cjs tests/game-shop-menu.test.cjs tests/game-native-control-compatibility.test.cjs tests/game-native-preparation-compatibility.test.cjs`56/56；最低Node26.0.0树外固定包、自有离线XState、父进程`--no-strip-types --experimental-sqlite`同样56/56。
- 全部9个旧fixture、13个独立LF摘要和原文/name/length/导出对照通过。既有VM接收器覆盖原moment、业务尾部、保存失败、pending保留与不重放。独立审查运行31/31，并核对默认参数闭包和角色计数。
- 完整已跟踪测试集合587项：586通过、0失败、1Windows跳过。命令由`git ls-files 'tests/*.test.cjs' 'experiments/gold-runtime/test/*.test.cjs'`取全部文件，再交给`node --experimental-sqlite --test`；集合对应npm test两组glob，排除另一worker尚未交付、未纳入此固定提交的新测试，未省略原安全测试。
- ZIP389文件匹配Git blob/CRC/export集合，SHA-256`78240236d1f54e2f7b4e802f6b48b89132931ba274645aa162ba8d3eb3620bfc`。[清单](package-f12-manifest.json)、[结果](batch-f12-results.json)。macOS ARM64、Node26.13.0/26.0.0，仅原有中性合成测试。

## Not validated / Known limitations

本批没有新增真实Chrome运行：协议正文保持原样，新增证据集中于模块边界、打包、原文/摘要及接收器VM回归。既有真实Chrome证据保留原身份，不挪作本批原生游戏验收。Windows、Android/WebView、真实DoL仍未验证。

36函数体仍为明确未类型化的原文协议输入；69/95是原入口接入数，包含9个源码载体，不是69个浏览器/业务算法体已类型化。剩余26原入口及适合的开发工具继续实施。[F07](BATCH_F07.md)初始空文档可靠性问题仍未解决，不以本批通过抹去该限制。
