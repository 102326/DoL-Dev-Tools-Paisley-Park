# TS First C06 — 规范化目标身份与键的一致性

2026-11-05。固定代码`ea70fd5c1c57498975d78413789a14e453034eb3`，基线`48dffaa768309289fec0692f97262c15a5bff08c`。不新增模块；仍47Node+7DOM strict/62产物，另1个冻结JS输入，103运行入口。

## Delivered

沿F04真实发现的规范化接缝，复现runtime-target原校验原对象再JSON克隆，可返回被抹去serial/targetId等字段的对象；key虽调用target，却丢弃返回值，遇到继承toJSON投影到另一合法身份时，两API不一致。两个回归先RED。现复用私有Android/Chrome原规则，原输入校验、单次JSON克隆、实际返回数据校验；key使用该返回值计算。crypto函数保留加载时捕获。

普通JSON目标和既有Android/Chrome完整哈希、Android键集合（不加host）、legacy optional selector的unknown边界保持。没有改持久Store/schema、Profile围栏粒度、旧pending/回执，没有按新键结清旧效果。审查只读确认未发现新增阻断，未独立跑测试；本次未观察到正常持久Runtime发生fencing事故，不把合成非JSON对象问题描述成实机故障。

## Validated

- `node tools/typescript/build.cjs --check`47Node+7DOM/62产物一致；`node tools/typescript/check-types.cjs`74指定负例。构建发布/回滚保护沿用F04同构建代码和配置的5/5，不重复计数；当前新源已实际编译并验证完整产物。
- `node --experimental-sqlite --test tests/typed-target.test.cjs tests/chrome-gameplay.test.cjs tests/pc-session.test.cjs tests/game-resource.test.cjs`16/16，覆盖继承/toJSON丢字段拒绝、返回身份与键一致、固定原哈希、同Profile围栏与原生资源代次。
- `npm test`562项：561通过、0失败、1Windows跳过。源码真实隔离Chrome PC12/12、GER/Evidence13/13，正常身份和旧未决恢复行为保持。
- 源码树外固定包按锁离线安装自有XState，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同16项通过；真实Chrome GER13/13。
- ZIP346文件匹配Git blob/CRC/export集合，SHA-256`6b0052c903d4afaefc022720db122c259cf5ce1d4349fccc31778bce710081df`。[清单](package-c06-manifest.json)、[结果](batch-c06-results.json)。Mac环境同F04，无游戏内容或设备。

## Not validated / Known limitations

Windows、Android设备/WebView、真实游戏未验证。此修复不建立任意宿主JS getter/Proxy的沙箱，也不扩成全仓克隆审计；源数据与原副作用仍由原业务合同约束。全Node核心迁移仍未完成。
