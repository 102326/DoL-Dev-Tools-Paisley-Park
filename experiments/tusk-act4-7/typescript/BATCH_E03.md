# TS First E03 — Support与兼容命令适配

2026-11-05。代码`4f866305791bf640b3444a5b94cadb64f39b8679`，基线`17f3ecd2a18f4f91fb2a6a07b0a7c0cfd988e36b`。新增support、hitbox-overlay、adb-evaluate、android-inspect权威CTS；30Node+3DOM/37产物。

## Delivered

Support的外部JSON/字段保持unknown views，按原白名单、Incident/摘要关联和嵌套版本检查投影，失败保持partial；旧incidentId弱正则未被类型化伪称严格string。SVG只插入校验后的有限数字/地址，不接受导入文本。通用evaluate只拥有本次连接，finally关闭，结果unknown；Android CLI适配器保留原Runner/输出报告/完整性条件，两处独立CLI对非Error的message改为可选读取，不猜根因。未将通用端点观察宣传为Chrome GER强绑定。

## Validated

- `build.cjs --check`30Node+3DOM/37产物；类型负例44个；构建5/5。
- `node --test tests/diagnostics.test.cjs tests/hitbox-overlay.test.cjs tests/android-inspect.test.cjs tests/cdp.test.cjs`12/12；Mac临时FS、合成素材/替身Runner/CDP，不连接设备。
- `npm test`543项：542通过、0失败、1Windows跳过。
- 源码树外固定包最低Node26.0.0、`--no-strip-types --experimental-sqlite --test`同四文件12/12；两个独立CLI `--help`退出0，未安装依赖或执行Android CLI。
- 固定ZIP330文件对应Git blob、CRC/导出集合，SHA-256`fa681defd5207f90d6fdc3ac75c3a274702e09e10002ddfd8458728862cd074e`。[清单](package-e03-manifest.json)、[结果](batch-e03-results.json)。

独立只读审查未见新增阻断，未独立跑测试。Windows、Android CLI/真机/WebView、真实游戏未验证。浏览器/业务指纹和持久Store合同未改，相应未变证据沿用原身份；不冒称此次重复完成实机或宿主发现。CLI主体、Action/Journey/Evidence及GER等继续迁移，完整Node门槛未完成。
