# TS First E01 — 受限采集与离线解析

2026-11-05。代码`3ffcd81b772bd36a920ea1afdb5bd9b4cbaed38e`，基线`97b14ee382911cc1fcc11d9120fe71dbd341cd83`。新增performance、logcat、record、animation权威CTS；原95个Node入口中23个strict，3个DOM-only资产，当前26源/98运行入口、30生成产物。

## Delivered

性能数字与帧样本解析、logcat固定格式/时间窗和消息省略、受限录屏自己的目录/二进制/清理、离线帧提取的输入/输出/工具Runner/状态有类型。collectors直接消费performance。保留旧CJS路径、require捕获、可选工具缺失与失败语义、原Source SHA复验、既有截断/失败manifest；不安装ffmpeg/ADB或新增依赖。record仅在成功读取后返回Buffer，finally清理与未知清理警告保持。独立静态审查未见新增阻断，未独立跑测试。

## Validated

- `build.cjs --check`：23Node+3DOM/30产物一致；`check-types.cjs`40指定负例。构建5/5。
- `node --test tests/logcat.test.cjs tests/animation.test.cjs tests/diagnostics.test.cjs tests/performance-series.test.cjs tests/evidence.test.cjs`32/32。真实临时文件、合成容器/PNG、替身ADB与注入媒体工具Runner；没有连接设备或调用真实媒体工具。
- `npm test`542项：541通过、0失败、1Windows跳过。
- 源码树祖先之外固定包最低Node26.0.0，`--no-strip-types --experimental-sqlite --test`同五个实际测试文件32/32。未安装包依赖，普通诊断仍不要求GER依赖。
- 固定ZIP330文件匹配Git blob、CRC/导出集合，SHA-256`1f2f03a9998732d584fdc2301f30c6bffe2e5a2fc8ec3b97a22e24f8ac7f03ea`；[清单](package-e01-manifest.json)、[结果](batch-e01-results.json)。

## Not validated / Known limitations

Windows、Android录屏/ADB/日志真机、真实媒体工具与游戏未验证。本轮不影响浏览器源码，复用D01/D02相应Chrome证据，不冒称在E01重复实测。CLI主体、Action/Journey/Evidence、其余浏览器与GER等继续迁移，整体未完成。
