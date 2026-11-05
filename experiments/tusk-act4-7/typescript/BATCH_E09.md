# TS First E09 — 公开环境观察的浏览器边界

2026-11-05。固定代码`dd5dbabcf93dda0e1a18994757a6b2189c055dac`，基线`586ae6cade6ccd781a2954a1c8c0339fcf7322ec`。41原Node+5DOM strict，52产物，新增环境浏览器资产纳入100运行入口。

## Delivered

环境metadata snapshot迁至DOM-only Program，Node环境解析/比较单独strict。浏览器函数无外部闭包，仍只读公开版本/Mod名单/viewport/capabilities，不读取游戏变量、存储正文或整个Mod元数据。保留缺名单不查询GameVersion、实际依赖异常可观察、名单上限/顺序不代表启用或执行顺序。CDP收集结果保留unknown，contract才声明其实际校验的字段。

独立审查发现一次提前缓存runtime的读取时序变化，已还原旧读取顺序，并以计数getter和早期无效browser组对照；没有新增通用机制。还原时曾误改四种结果字段键名，被现有比较测试和旧对照捕获，已修复并重跑最终结果。编译失败时运行的旧CJS初步结果不作为新实现证据。未改业务函数指纹或回执合同。

## Validated

- `node tools/typescript/build.cjs --check`41Node+5DOM/52产物一致；`node tools/typescript/check-types.cjs`63指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --test tests/environment.test.cjs tests/environment-source-compatibility.test.cjs tests/evidence.test.cjs tests/evidence-tools.test.cjs`40/40；8种metadata观察、contract/diff与固定旧自有实现相同，两种getter路径读取次数/结果一致。
- `npm test`551项：550通过、0失败、1Windows跳过。
- 源码真实隔离Chrome GER/Evidence13/13，覆盖标准环境、缺元数据unknown、Known Good/Compare双向、目标与副作用恢复。
- 源码树外固定包按锁离线安装自有XState，解析路径确认在包内；最低Node26.0.0父进程`--no-strip-types`定向40/40、真实Chrome GER13/13。
- ZIP338文件匹配Git blob/CRC/export集合，SHA-256`4a9abde05855dfd29b582bd80e13e6babd177f7c2869c91bec15c095d98eda26`。[清单](package-e09-manifest.json)、[结果](batch-e09-results.json)。Mac环境同E06，全部无游戏合成内容。

## Not validated / Known limitations

Windows、Android设备/WebView、真实游戏未验证。游戏版本/Mod名单只是公开metadata，不能替代实际加载/业务结果。原32个浏览器静态命中现处理DOM/CSS/Inspector/Journey/Environment五项，其余源码注入与摘要所有者仍须逐项处理，完整Node门槛尚未完成。
