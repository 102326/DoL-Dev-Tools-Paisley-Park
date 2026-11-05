# TS First E06 — 标准 Evidence 接线与投影边界

2026-11-05。固定代码`8c101c5ac102ddef96e8f990be1fcbde5c9ff16c`，基线`ee227523c847fc72361f6ded0ce7b224d7e8fd39`。34个原Node模块与4个DOM-only模块接入strict，43产物，运行入口99项；完整迁移继续。

## Delivered

标准Evidence的Options、Context、Methods、Step、Manifest与Integration信息接入类型。采集输出继续为unknown，允许原有扩展的artifact字段不伪称固定字符串。Collector与执行上下文统一实际使用的连接工厂签名；连接调用、lazy require、Generic/Optional分离、独占文件写入与finally清理保持。

审查发现并以失败用例确认两处旧投影缺陷：版本采集override可覆盖manifest事件身份、schema、步骤与隐私；Integration description扩展可覆盖index/status。现在仅投影三个标准版本字段，description仅投影name/version/supportedApiVersion/capabilities，索引和状态由协调器拥有。完整脱敏输出仍在versions.json或对应Integration数据文件中；自定义顶层版本扩展改为从versions.json读取，兼容说明见docs/EVIDENCE_TOOLS.md。真实worker本已限制description字段，因此第二项影响主要是内部override扩展。

保留Session、预算、fencing、原回执、Unknown与恢复语义，没有更改Store或清理未决副作用。只读审查确认两处投影收口，未独立执行测试。

## Validated

- `node tools/typescript/build.cjs --check`34Node+4DOM/43产物一致；`node tools/typescript/check-types.cjs`55指定类型负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --test tests/evidence.test.cjs tests/diagnostics.test.cjs tests/deep.test.cjs tests/environment.test.cjs tests/integration.test.cjs tests/execution-context.test.cjs tests/journey.test.cjs`78/78。两个新增投影用例先在旧行为失败，再在生成代码通过。
- `npm test`548项：547通过、0失败、1Windows跳过。首次编译尚未通过时运行的43项旧CJS结果不作为新实现证据；最终记录来自成功生成后的运行。
- 源码真实隔离Chrome Integration10/10、GER/Evidence13/13。覆盖detect/collect/hash/reload/redact文档绑定、可选失败保留Generic、预算/真实合成状态、原pending恢复与不重复派发。
- 源码树外独立包、无node_modules、移除NODE_PATH与DOL_DEV_TOOLS_HOME；最低Node26.0.0父进程`--no-strip-types`同78项通过，真实Chrome Integration10/10、清理确认。
- 固定ZIP335文件逐一匹配Git blob、CRC与导出集合，SHA-256`637ea86b35c2f966d8271bd1455891f898bd2d73102adef6ad3992e0a71dca59`。[逐文件清单](package-e06-manifest.json)、[结果](batch-e06-results.json)。Mac27.0.1 ARM64，源码Node26.13.0，Chrome156.0.8078.73；只有无游戏合成内容。

## Not validated / Known limitations

Windows、Android设备/WebView、真实DoL未验证。未把清理失败、可选采集失败或unknown解释成业务完成；证据字段类型并不替代独立业务Outcome。CLI主体、其余Evidence工具和GER等尚需迁移，本批通过不代表7.0发布门槛全部完成。
