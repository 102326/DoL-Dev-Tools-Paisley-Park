# TS First E08 — 网络、视口与Journey矩阵

2026-11-05。固定代码`37c4a8fbafc0d85011bdd867a4b08e22022be4a3`，基线`d6bc4feb7027ee136f5b24426d6043963748fece`。40原Node+4DOM strict/49产物，运行99项，完整迁移继续。

## Delivered

network-lab、viewport、matrix接入strict输入、计划、报告、原连接接口、override与清理记录。保留前置验证、显式测试授权、独占输出、原会话恢复、恢复未确认保留unknown、不采用替代连接；声明中性基线不等于读出原覆盖状态，视口不等于真实设备。矩阵保留公开环境前提、失败后后续跳过，不从reported Mod名单推导启用/执行顺序。

无预期功能或协议变化；只读对照审查未发现新增阻断或具体输出类型过度承诺，未独立运行测试。

## Validated

- `node tools/typescript/build.cjs --check`40Node+4DOM/49产物一致；`node tools/typescript/check-types.cjs`61指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --test tests/network-lab.test.cjs tests/viewport.test.cjs tests/matrix.test.cjs tests/journey.test.cjs`19/19，包含部分派发即失败仍恢复、断连/恢复失败不宣称成功、视口截图/结构脱敏、矩阵失败跳过。
- `npm test`549项：548通过、0失败、1Windows跳过。
- 源码树外固定包无node_modules，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同19项通过。
- ZIP335文件匹配Git blob、CRC/export集合，SHA-256`04ab939fe0ef068c4da7354f04792dbb24b3c3e227029fe7f96585e15d05458f`。[清单](package-e08-manifest.json)、[结果](batch-e08-results.json)。Mac环境同E07。

## Not validated / Known limitations

本批网络/视口协议为合成替身，没有新跑真实Chrome仿真操作；既有Chrome Journey真实证据保持原身份。Windows、Android设备/WebView、真实游戏未验证。本批不建立跨CDP会话隔离、detach后恢复持久性或远端取消保证；此类原边界在报告中保持。CLI/Evidence工具主体与GER等继续迁移。
