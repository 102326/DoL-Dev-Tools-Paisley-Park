# TS First E10 — Host 工具、CLI 与可选 Integration

2026-11-05。固定代码`a1a2e775855c3c3f8d2ff62edbbedc5dbc3ae3db`，基线`45fe25d796c0005c916668895d14e2f0df83085b`。81/95原Node入口接入strict（含9源码载体），另15个真正DOM-only TS源，112生成产物，15冻结JS协议资产共37函数体未类型化，125运行入口。完整迁移继续。

## Delivered

4个Host工具app-lifecycle/deep/recorder/timeline、CLI主体及7个Integration Node模块接入权威CTS。Recorder、Timeline、Patch observation、UI诊断/Gameplay、native-head状态/恢复7个普通DOM探针采用独立DOM Program实际类型检查。它们不参与持久合同摘要，以行为对照和真实浏览器验证；native-head operation参与旧合同，保留原JS原文，独立摘要`869f169045af7569892b6214cd2d238fe4cf03df71aa76b39381d8f6f425ad7c`。

远端objectId仅被原逻辑检查truthy，因此保留unknown；timeline原始cleanupConflicts也保留unknown，沿用既有数值比较的行为，不伪造数字验证。新增数值objectId、字符串计数回归。CLI中尚未迁移Goal/Site/Clothing/EvidenceTools保留有限临时接口，随对应生产模块迁移接回真实owner。没有改Unknown、Session、fencing、目标/证据边界或收据合同。

## Validated

- `node tools/typescript/build.cjs --check`81Node+15DOM/112产物；`node tools/typescript/check-types.cjs`117指定负例；`node --test tools/typescript/test/build.test.cjs`5/5。
- `node --experimental-sqlite --test tests/app-lifecycle.test.cjs tests/deep.test.cjs tests/recorder.test.cjs tests/timeline.test.cjs tests/host-tools-compatibility.test.cjs tests/integration-boundary-types.test.cjs tests/integration-native-head-abi.test.cjs tests/integration.test.cjs tests/patch-observation-integration.test.cjs tests/ui-source-link.test.cjs tests/cli-errors.test.cjs tests/native-head.test.cjs tests/game-native-wardrobe.test.cjs`65/65；最低Node26.0.0树外固定包、自有离线XState、`--no-strip-types --experimental-sqlite`同样65/65。`npm test`592项：591通过、0失败、1Windows跳过。独立审查50/50。
- 源码及最低Node固定包，`contracts/probes-verify.cjs CHROME NEW_DIRECTORY`各5/5：真实可信CDP点击/输入，Recorder不保留合成输入值，候选仍不可直接执行；Timeline实际观察MutationObserver及事件，检查实例own observe/disconnect/takeRecords存在且不同于prototype，然后确认实例和全局构造器还原。最初较弱的仅availability断言已增强，旧记录保留，不作为最终证据。probeCleanup与browserCleanup分开报告，均confirmed。
- 源码及最低Node包`integration/verify.cjs CHROME NEW_DIRECTORY`各10/10：原目标、同URL peer隔离、detect/collect导航与重载、URL ABA、redact期间文档变化、Generic保留、缺失/超时模块和目标关闭，均清理自有浏览器。
- macOS27.0.1 ARM64、Node26.13.0/26.0.0、Chrome156.0.8078.73；中性自编HTML，无游戏内容。正式CLI真实新进程另验证source-link6/6、main CLI10/10；早期预加载main缓存导致的测试驱动失败保留，未挪作生产成功证明。
- 固定ZIP共402文件，Git blob/CRC/导出集合一致，SHA-256`343c2967f24e4dcc992f5be68ad8cb75c6b0ba38cdbfe7ff4e15972edb1d2c54`。[清单](package-e10-manifest.json)、[结果](batch-e10-results.json)。

## Not validated / Known limitations

Windows、Android实机/WebView、真实DoL未验证。新Chrome探针证明可信CDP输入，不代表人工触控/Android输入。Host Android测试使用fake ADB。37冻结函数体仍未类型化。14原Node核心及适合开发工具仍继续；F07初始空文档问题未解决，通过本批不表示启动可靠性已修复。
