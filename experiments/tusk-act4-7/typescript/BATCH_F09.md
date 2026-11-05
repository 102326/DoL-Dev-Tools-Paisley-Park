# TS First F09 — 原生衣柜与商店映射producer

2026-11-05。固定代码`9481ad0e954fbcabb07d22f32e90ce537b71fae9`，基线`7ab99e6a51a264eed46b18063ca62d5000621c22`。55原Node+8DOM strict/72产物，另5冻结JS输入共10函数体未类型化，108运行入口。

## Delivered

`game-wardrobe`和`game-shop`的Node验证、原生来源证明、价格/变体核对、回执判定与清理协调迁入strict。两个native消费者直接消费权威生产模块的类型，移除F08的临时Mapping端口；Held/Mapped亦使用真实producer类型。验证器保持原对象引用，调用者从该原返回值窄化，不新增克隆、属性读取、授权或执行。attest明确不是terminal证据；对象ID与页面业务字段继续unknown。

原衣柜reader/branchGuard与商店reader的文本参与既有合同，保留LF冻结JS资产；三个独立旧摘要与完整旧模块对照，未用TS重印。Node-only `shop.inspect`由匿名导出箭头改为命名函数声明，其函数文本/名字变化，但仓内仅直接调用，不用于注入或摘要；导出键与观察/清理结果保持。control、save等未迁移JS端口仍单独列入待办，没有将其推定为typechecked。

## Validated

- `node tools/typescript/build.cjs --check`55Node+8DOM/72产物一致；`node tools/typescript/check-types.cjs`94指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/game-clothing-mapping-compatibility.test.cjs tests/game-shop.test.cjs tests/game-native-preparation-compatibility.test.cjs tests/native-head.test.cjs tests/game-native-wardrobe.test.cjs tests/game-native-wardrobe-operation.test.cjs tests/game-native-shop-operation.test.cjs tests/game-native-save.test.cjs`48/48；最低Node26.0.0源码树外固定包、自有离线XState、父进程`--no-strip-types --experimental-sqlite`同样48/48。
- 新旧对照检查15种请求接受/拒绝与原引用、11种occurred/未决/save见证判定、6种衣柜attest及9种商店prepare/inspect路径；完整CDP、原getter源码、quote拒绝、原生money闭包、释放和复合失败保持。既有浏览器VM测试继续覆盖旧分支、原生衣柜终态、回调/存档边界；F08的20种准备差分继续通过。独立审查运行17/17，并核对类型事实、源码原文、lazy require和清理。
- `npm test`579项：578通过、0失败、1Windows跳过。没有改变Store、目标、预算、Ledger/schema、旧Unknown或失败结算。
- ZIP362文件逐项匹配Git blob/CRC/export集合，SHA-256`213c7204462e2b0b18da58db8568a3c83e1fa192062faf1b20667a4e4437a660`。[清单](package-f09-manifest.json)、[结果](batch-f09-results.json)。macOS ARM64、Node26.13.0及最低26.0.0，仅自写合成数据。

## Not validated / Known limitations

本批没有新增真实Chrome运行：浏览器注入文本/摘要保持，新增证据为Node端与合成CDP/VM对照，全套另含既有临时SQLite回归；[F08](BATCH_F08.md)最低Node固定包的Chrome GER13是共享核心的既有证据，不能冒充本批原生业务实测。Windows、Android/WebView、真实DoL、原生商店/衣柜真实执行仍未验证。

冻结10函数体未类型化，原control/save等JS producer未完成迁移；[F07](BATCH_F07.md)的偶发绑定前空文档超时物理原因仍未定，本批未改启动路径。按上述映射合同范围达到Scoped Done，55/95仍不满足完整7.0迁移/发布门槛。
