# TS First E05 — Journey与Chrome检查点

2026-11-05。代码`cbf1fcdd93f9aee33b6cc8756717727d8129eb65`，基线`e2f1ae7d900eed1a101830ac445ed5a8a31166d1`。新增Journey/ChromeEvidence Node CTS与DOM-only waitProbe；33Node+4DOM/42产物，新增浏览器资产计入99项清单。

## Delivered

Journey Step联合区分Action、时间等待、选择器等待与检查点；Plan/Loaded/Entry/Report/Overrides有实际类型。保留原步骤限制、deadline、作用前未知记录、notDispatched、checkpoint逐步持久化、unsupported失败和finally清理。name保留unknown，不因旧正则可强制转换而宣称严格字符串。waitProbe作为独立DOM函数生成，Node入口/导出与语义保持，未改任何业务源码指纹。

ChromeEvidence为真实截图返回Buffer/PNG元数据，其余字段保守unknown；截图与其他检查点每条路径仍仅调用一次，保留共同状态检查与lazy require。共有cdpWindow的可选元数据反映原override未必有captureStart，不把缺失字段伪称完整。独立只读审查未见新增阻断，未独立跑测试。

## Validated

- Program33Node+4DOM/42产物一致；52指定类型负例，含wait互斥字段、capture种类、截图Buffer及不保证远端取消；构建5/5。
- `node --test tests/journey.test.cjs tests/journey-source-compatibility.test.cjs tests/chrome-gameplay.test.cjs tests/execution-context.test.cjs tests/action.test.cjs tests/evidence.test.cjs`70/70。等待20种condition/state和2个计划与固定旧自有实现相同；页面上下文无Node globals。
- `npm test`546项：545通过、0失败、1Windows跳过。
- 源码真实隔离Chrome PC12/12、GER/Evidence13/13；包括真实等待、Journey八种checkpoint、目标变化/断线、原pending恢复与标准Evidence。
- 源码树外、无node_modules固定包最低Node26.0.0父进程`--no-strip-types`PC12/12，普通Debug不引入GER依赖。
- 固定ZIP335文件匹配Git blob、CRC/export集合，SHA-256`8168b1abd4060996e1ce84c012f9ccf0d62f6639c044d5ec167ef78054d08b2f`。[清单](package-e05-manifest.json)、[结果](batch-e05-results.json)。环境与E04相同，无游戏/设备。

## Not validated / Known limitations

Windows、Android真机/WebView、真实游戏未验证。本批触及原32个浏览器静态命中中的Journey，共处理DOM/CSS/Inspector/Journey四项；其他原生源码与回执协议继续逐项处理。Evidence主体、CLI主体、GER及适合的开发工具迁移尚未完成，不能因当前33个Node模块通过而宣布完整Node门槛完成。
