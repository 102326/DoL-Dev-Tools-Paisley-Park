# TS First 执行进度与完成清单

2026-11-05。用户已批准完整Node核心迁移作为7.0发布门槛；开发包P2，UI4.2为P1。按依赖继续本机研发，不因首批通过宣称整体完成。正式发布另行授权，Windows/Android/真实游戏验收保留。

固定开工基线：`18544c8d1cb2a751130bf023cfc37b531ed6b722`。完整方案见[实施计划](../../../docs/superpowers/plans/2026-11-05-tusk-act4-ts-first.md)。本清单仅为工程记录，不是第二个Runtime或执行系统。

## 批次

- A 构建正式化：本机验收完成，代码`0196e86989facae13e765dc3bff58046b53502a7`。隔离开发包、完整Program、5个生成产物、漂移/部分写入/回滚/权限/协作锁检查。
- B diagnostics/runtime-target：本机验收完成。CJS导出与目标键保留，14类型负对照通过，44定向回归通过；独立包最低Node26和10项Chrome夹具通过；4项构建保护、527项全套中526通过/1Windows跳过。详见[BATCH_AB](BATCH_AB.md)。
- C CDP/IPC/宿主：本机验收完成。C01的CDP/IPC/worker已通过本机验收，固定代码`eb8e13ad4e5ac2d1b6b10f03714a94041b339b49`；532项全套中531通过/1Windows跳过，22类型负例、最低Node26独立包10项Chrome通过。详见[BATCH_C01](BATCH_C01.md)。C02宿主/执行上下文已验收，代码`7d0d91baface643efa43a18cbde9248858905624`；535项中534通过/1Windows跳过，26类型负例、源码Chrome GER13/13、最低Node26包Integration10/10，见[BATCH_C02](BATCH_C02.md)。C03启动/HTTP/宿主输入已验收，代码`3e6909fa01a0dfb76868dc4072c3242bd275ff72`；536项中535通过/1Windows跳过，源码与最低Node26独立包PC12/12，见[BATCH_C03](BATCH_C03.md)。C04共享Collector/privacy/owned-files已验收，代码`e55a4d43c44462c2f4fe33370226f49a87181126`；536项535通过/1Windows跳过、32类型负例、构建4/4。首次Chrome发现超时保留，串行诊断与最低Node26包均10/10；C05已修复准备循环一次发现超时提前退出，代码`d4c09ba089492d36d54445326ef2e6cd21497223`；539项538过/1Windows跳过，故障注入3/3，源码及最低Node26包PC12/12。首次物理超时根因不作无证据推断，见[BATCH_C04](BATCH_C04.md#c05-后续只读启动等待收口)。
C06目标规范化补修已验收，代码`ea70fd5c1c57498975d78413789a14e453034eb3`；16定向及最低Node26包通过、562项561过/1Windows跳过、源码PC12+GER13、最低Node26独立包GER13通过，见[BATCH_C06](BATCH_C06.md)。
- D 浏览器边界：D01已验收，代码`da5eacd4179d0ea1d6d4b3008bb163f0b47f094e`；DOM/CSS双Program、23定向、12对旧/新观察、构建5/5、541项540过/1Windows跳过；源码Chrome10+13与最低Node26独立包GER13通过。见[BATCH_D01](BATCH_D01.md)。D02 Inspector也已验收，代码`88bb7dcea6d7ede5500d02935422346d70e25513`；29定向、5构建、542项541过/1Windows跳过、源码与最低Node26无依赖独立包PC12/12，见[BATCH_D02](BATCH_D02.md)。E05另处理Journey等待探针，原32命中共处理五项（另含E09环境），其余继续逐项核对。
- E CLI/Action/Journey/Evidence：E01受限采集/离线解析4模块已验收，代码`3ffcd81b772bd36a920ea1afdb5bd9b4cbaed38e`；32定向及最低Node26独立包32/32，542项541过/1Windows跳过、40类型负例、5构建。见[BATCH_E01](BATCH_E01.md)。E02安装/Doctor/源码查询入口3模块已验收，代码`5ebc5d8ea75f17f05498730d9b232220fca7643b`；543项542过/1Windows跳过，定向与最低Node26包31过/1Windows跳过、41类型负例、5构建；Doctor旧Node22门槛已对齐26，见[BATCH_E02](BATCH_E02.md)。E03 Support/SVG/兼容CLI四模块已验收，代码`4f866305791bf640b3444a5b94cadb64f39b8679`；543项542过/1Windows跳过，定向与最低Node26包12/12、44类型负例、5构建，见[BATCH_E03](BATCH_E03.md)。E04 Action已验收，代码`a443698a30839a8b3dbce8f659d0bf0186e34430`；52定向、545项544过/1Windows跳过、48类型负例、5构建，五种实际派发源码/参数旧对照一致、独立审查15/15；源码及最低Node26包GER13/13，见[BATCH_E04](BATCH_E04.md)。E05 Journey/ChromeEvidence已验收，代码`cbf1fcdd93f9aee33b6cc8756717727d8129eb65`；70定向、546项545过/1Windows跳过、52类型负例、5构建，20等待旧对照；源码ChromePC12+GER13、最低Node26无依赖独立包PC12通过，见[BATCH_E05](BATCH_E05.md)。E06标准Evidence已验收，代码`8c101c5ac102ddef96e8f990be1fcbde5c9ff16c`；78定向、548项547过/1Windows跳过、55类型负例、5构建，版本/description投影两项RED/GREEN；源码Integration10+GER13、最低Node26独立包78定向及Integration10通过，见[BATCH_E06](BATCH_E06.md)。E07连续性能/进程内存/原生布局已验收，代码`9a95c9fcb7adeccfa885e18835bbff4132c6bb70`；7定向及最低Node26包7/7、549项548过/1Windows跳过、58类型负例、5构建，有限错误分类RED/GREEN，见[BATCH_E07](BATCH_E07.md)。E08网络/视口/矩阵已验收，代码`37c4a8fbafc0d85011bdd867a4b08e22022be4a3`；19定向及最低Node26包19/19、549项548过/1Windows跳过、61类型负例、5构建，见[BATCH_E08](BATCH_E08.md)。E09环境Node/DOM已验收，代码`dd5dbabcf93dda0e1a18994757a6b2189c055dac`；40定向、551项550过/1Windows跳过、63类型负例、5构建，8种旧metadata对照；源码/最低Node26独立包GER各13/13，见[BATCH_E09](BATCH_E09.md)。E10 Host/CLI/Integration已验收，代码`a1a2e775855c3c3f8d2ff62edbbedc5dbc3ae3db`；65定向及最低Node包、592项591过/1Windows跳过、117负例、5构建、独立50项；源码/最低Node真实Chrome probes各5、Integration各10通过，见[BATCH_E10](BATCH_E10.md)。Evidence tools及CLI真实owner接线已在最终批次收口。
- F GER/Session/业务Provider：F01意图/预算/原生调用已验收，代码`0c48af184cb23714861f4c2a1fccb42712d5a3cf`；19定向及最低Node26包通过、552项551过/1Windows跳过、66类型负例、5构建、源码Chrome GER13/13，见[BATCH_F01](BATCH_F01.md)。F02原生render协调已验收，代码`067d6b5a47e8c0ef91202671f37db3524de33a07`；45Node/5DOM strict之外明确保留1个JS协议输入（2函数未类型化），40定向及最低Node26包通过、554项553过/1Windows跳过、68类型负例、5构建，固定原摘要/帧及CRLF负对照通过，见[BATCH_F02](BATCH_F02.md)。F03源码证明已验收，代码`1f966b6089184a6adfc6c2c7642e900b4f985778`；61定向及最低Node26包通过、557项556过/1Windows跳过、71类型负例、5构建，falsy协议失败RED/GREEN40组合；源码/最低Node26独立包真实CDP闭包各7/7，见[BATCH_F03](BATCH_F03.md)。F04 Goal条件/报价已验收，代码`1c2b27ada8c2e44bd1508a3204b8eee4302a504c`；77定向及最低Node26包通过、560项559过/1Windows跳过、74类型负例、5构建，克隆丢字段RED/GREEN；源码/最低Node26独立包真实Chrome状态条件各8/8，见[BATCH_F04](BATCH_F04.md)。F05授权/原生资源已验收，代码`bbe2b0475afc8a5d775477db1c3820027e818bdd`；66定向及最低Node26包通过、566项565过/1Windows跳过、77类型负例、5构建、独立12/12；源码/最低Node26包Chrome GER各13/13，见[BATCH_F05](BATCH_F05.md)。F06回执协调/DOM已验收，代码`b7cecdc43ebd3ff6dc5f7d6ef99fad4cb88f9875`；13定向及最低Node26包通过、569项568过/1Windows跳过、80类型负例、5构建、独立7/7；源码/最低Node26包真实回执维护各8及GER各13通过，见[BATCH_F06](BATCH_F06.md)。F07业务闭包绑定已验收，代码`f96881d4db07f45fa364c840e942463fe400bb98`；30定向及最低Node26包通过、571项570过/1Windows跳过、84类型负例、5构建、独立17/17；源码/最低Node26无钩子包真实Chrome各6/6。最低Node包两次绑定前空文档超时保留，物理原因未定，后续通过不表示启动可靠性修复，见[BATCH_F07](BATCH_F07.md)。F08衣柜/商店原生准备已验收，代码`6a357bfbf8a9400638d269deda4a0d2363740a84`；26定向及最低Node26包通过、574项573过/1Windows跳过、89类型负例、5构建、独立9/9；20种旧准备帧/摘要对照及最低Node26包Chrome GER13通过，见[BATCH_F08](BATCH_F08.md)。F09衣柜/商店映射producer已验收，代码`9481ad0e954fbcabb07d22f32e90ce537b71fae9`；48定向及最低Node26包通过、579项578过/1Windows跳过、94类型负例、5构建、独立17/17，见[BATCH_F09](BATCH_F09.md)。F10原生控件/导航已验收，代码`325a08301a53cf6f172173b8791f6d0c29b8bd59`；52定向及最低Node26包通过、582项581过/1Windows跳过、99类型负例、5构建、独立10/10；源码/最低Node26包真实Chrome闭包/控件读取各6项通过，见[BATCH_F10](BATCH_F10.md)。F11 History/save/environment协调已验收，代码`6bc4f6a62375a6758ad571fb8326bfd250c64859`；60定向及最低Node包、586项585过/1Windows跳过、106类型负例、5构建、独立18/18；源码/最低Node包真实IndexedDB观察各5项及恢复冲突负对照，见[BATCH_F11](BATCH_F11.md)。F12接收器源码载体已验收，代码`6fc3657124118b0298ecafdb50ecdcc764030bb7`；新增9项仅为源码载体、13函数仍原文协议角色，56定向及最低Node包、587项586过/1Windows跳过、109类型负例、5构建、独立31/31，见[BATCH_F12](BATCH_F12.md)。F13及余下核心已本机收口，代码`54187d78602dff7d23c91a521be512ee361ac786`，含两处falsy cleanup和config持久值一致性修复；见[CLOSEOUT_MAC](CLOSEOUT_MAC.md)。源码指纹与旧未决恢复仍为硬合同。
- G 适合的开发/验证工具：本机收口完成，固定代码`54187d78602dff7d23c91a521be512ee361ac786`。build/check-types/build.test三入口权威CTS，自举98Node+17DOM/133产物；125精确负例、5构建保护；核心源码与最低Node独立包均621项620通过/1Windows跳过，Chrome GER各13、Integration各10。完整收口见[CLOSEOUT_MAC](CLOSEOUT_MAC.md)。Python/Kotlin/历史oracle不机械迁移。

## 核心模块清单

开工运行集合95个Node CJS，当前全部95项已权威CTS接入strict（含9个源码载体）；另17个DOM-only源及21个冻结JS协议资产共46函数体未类型化，运行清单133项。3个开发入口另计，Node Program98项；生成产物133项与运行清单是不同集合。**本机迁移已Scoped Done，7.0尚未正式验收/发布。**

| 原运行入口 | Node迁移 | 浏览器边界 |
| --- | --- | --- |
| `.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `integrations/examples/dom-summary.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `integrations/examples/native-lifecycle.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `integrations/examples/patch-observation.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `integrations/soft-and-wet/gameplay.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `integrations/soft-and-wet/index.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `integrations/soft-and-wet/native-head.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `integrations/soft-and-wet/source-link.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `scripts/adb-evaluate.cjs` | strict构建已接入，E03本机通过 | 未命中该静态模式 |
| `scripts/android-inspect.cjs` | strict构建已接入，E03本机通过 | 未命中该静态模式 |
| `scripts/dol-dev.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `scripts/lib/action.cjs` | strict构建已接入，E04本机通过 | 未命中该静态模式 |
| `scripts/lib/animation.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/app-lifecycle.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `scripts/lib/cdp.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/chrome-evidence.cjs` | strict构建已接入，E05本机通过 | environment旧函数源引用保留；该函数所有者待单独迁移 |
| `scripts/lib/chrome-host.cjs` | strict构建已接入，C02本机通过 | 未命中该静态模式 |
| `scripts/lib/chrome-launch.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/collectors.cjs` | strict构建已接入，C04本机通过 | 未命中该静态模式 |
| `scripts/lib/css.cjs` | strict构建已接入，D01本机通过 | DOM-only独立Program，固定旧输出/真实Chrome通过 |
| `scripts/lib/deep.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `scripts/lib/diagnostics.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/doctor.cjs` | strict构建已接入，E02本机通过 | 未命中该静态模式 |
| `scripts/lib/dom.cjs` | strict构建已接入，D01本机通过 | DOM-only独立Program，固定旧输出/真实Chrome通过 |
| `scripts/lib/environment.cjs` | strict构建已接入，E09本机通过 | DOM-only metadata；固定旧对照与真实Chrome通过 |
| `scripts/lib/evidence-tools.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/evidence.cjs` | strict构建已接入，E06本机通过 | 未命中该静态模式 |
| `scripts/lib/execution-context.cjs` | strict构建已接入，C02本机通过 | 未命中该静态模式 |
| `scripts/lib/game-capabilities.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-clothing-provider.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-contract.cjs` | strict构建已接入，F03本机通过 | DOM-only Widget证明；原CDP闭包/帧与falsy拒绝回归 |
| `scripts/lib/game-dol-provider.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-goal-reader.cjs` | strict构建已接入，F04本机通过 | DOM-only Goal条件/Quote；实际返回克隆与原状态检查 |
| `scripts/lib/game-goal.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-native-business-bindings.cjs` | Node协调strict，F07本机通过 | 1冻结JS guard未类型化；原摘要/LF/帧与真实闭包 |
| `scripts/lib/game-native-control.cjs` | Node协调strict，F10本机通过 | 1冻结JS reader未类型化；完整旧帧与真实DOM归属 |
| `scripts/lib/game-native-daily-state.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-native-environment.cjs` | Node协调strict，F11本机通过 | 8冻结函数未类型化；原guard/metadata/owner |
| `scripts/lib/game-native-garden-state.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-native-generic-landing.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-native-hall-state.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-native-history.cjs` | Node协调strict，F11本机通过 | 2冻结函数未类型化；原history源码/帧 |
| `scripts/lib/game-native-hour-state.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-native-invocation.cjs` | strict构建已接入，F01本机通过 | 未命中该静态模式 |
| `scripts/lib/game-native-navigation.cjs` | strict构建已接入，F10本机通过 | 原模板/摘要/清理；真实V8 lexical与send/evaluate边界 |
| `scripts/lib/game-native-profile.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-native-provider.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-native-radio.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-native-render-tasks.cjs` | Node协调strict，F02本机通过 | 2函数原样JS ABI，未类型化；固定原digest/帧/LF |
| `scripts/lib/game-native-save.cjs` | Node协调strict，F11本机通过 | 2冻结函数未类型化；原digest/投影及真实合成IDB |
| `scripts/lib/game-native-street-recovery.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-native-street-state.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-native-time.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-navigation-operation.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-project-provider.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-receipts.cjs` | strict构建已接入，F06本机通过 | DOM-only namespace/读取/退役，真实64槽与旧对照通过 |
| `scripts/lib/game-resource.cjs` | strict构建已接入，F05本机通过 | 未命中该静态模式 |
| `scripts/lib/game-runtime.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-scope.cjs` | strict构建已接入，F05本机通过 | 未命中该静态模式 |
| `scripts/lib/game-semantic.cjs` | strict构建已接入，F01本机通过 | 未命中该静态模式 |
| `scripts/lib/game-shop-menu-native.cjs` | strict构建已接入，最终Mac收口通过 | 具体普通DOM/冻结协议角色见CLOSEOUT_MAC |
| `scripts/lib/game-shop-menu-operation.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-shop-native.cjs` | Node协调strict，F08本机通过 | 4原函数冻结JS ABI，未类型化；完整旧准备帧/摘要/LF |
| `scripts/lib/game-shop-operation.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-shop.cjs` | Node协调strict，F09本机通过 | 原reader冻结JS ABI；旧source/quote/清理帧，VM与原摘要 |
| `scripts/lib/game-spend.cjs` | strict构建已接入，F01本机通过 | 未命中该静态模式 |
| `scripts/lib/game-wardrobe-native.cjs` | Node协调strict，F08本机通过 | 旧prepare/清理/摘要对照；所引用JS producer另列 |
| `scripts/lib/game-wardrobe-operation.cjs` | CTS源码载体，F12本机通过 | 仅toString；原函数未类型化，原文/摘要/接收器VM保持 |
| `scripts/lib/game-wardrobe.cjs` | Node协调strict，F09本机通过 | 原reader/branchGuard冻结JS ABI；旧attest/receipt与原摘要 |
| `scripts/lib/hitbox-overlay.cjs` | strict构建已接入，E03本机通过 | 未命中该静态模式 |
| `scripts/lib/host-options.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/inspectors.cjs` | strict构建已接入，D02本机通过 | DOM-only六模式/storage，固定旧观察与真实Chrome通过 |
| `scripts/lib/install-skill.cjs` | strict构建已接入，E02本机通过 | 未命中该静态模式 |
| `scripts/lib/integration-worker.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/integration.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/journey.cjs` | strict构建已接入，E05本机通过 | DOM-only等待探针，20旧对照与真实Chrome通过 |
| `scripts/lib/logcat.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/matrix.cjs` | strict构建已接入，E08本机通过 | 未命中该静态模式 |
| `scripts/lib/native-layout.cjs` | strict构建已接入，E07本机通过 | 未命中该静态模式 |
| `scripts/lib/network-lab.cjs` | strict构建已接入，E08本机通过 | 未命中该静态模式 |
| `scripts/lib/owned-files.cjs` | strict构建已接入，C04本机通过 | 未命中该静态模式 |
| `scripts/lib/pc-http.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/pc-session.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/performance-series.cjs` | strict构建已接入，E07本机通过 | 未命中该静态模式 |
| `scripts/lib/performance.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/privacy.cjs` | strict构建已接入，C04本机通过 | 未命中该静态模式 |
| `scripts/lib/process-memory.cjs` | strict构建已接入，E07本机通过 | 未命中该静态模式 |
| `scripts/lib/record.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/recorder.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `scripts/lib/runtime-target.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/source-find-cli.cjs` | strict构建已接入，E02本机通过 | 未命中该静态模式 |
| `scripts/lib/source-find.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/support.cjs` | strict构建已接入，E03本机通过 | 未命中该静态模式 |
| `scripts/lib/timeline.cjs` | strict构建已接入，E10本机通过 | DOM探针/冻结合同见E10报告 |
| `scripts/lib/viewport.cjs` | strict构建已接入，E08本机通过 | 未命中该静态模式 |

## 新增运行资产（纳入清单，不隐藏新增工作）

| 运行入口 | 角色与状态 |
| --- | --- |
| `scripts/lib/browser/dom.cjs` | DOM-only TS生成；D01本机通过 |
| `scripts/lib/browser/css.cjs` | DOM-only TS生成；D01本机通过 |
| `scripts/lib/browser/inspectors.cjs` | DOM-only TS生成；D02本机通过 |
| `scripts/lib/browser/journey-wait.cjs` | DOM-only TS生成；E05本机通过 |
| `scripts/lib/browser/environment.cjs` | DOM-only TS生成；E09本机通过 |
| `scripts/lib/browser-abi/native-render-tasks.cjs` | 原样JS协议输入；2函数体未类型化，F02保持性通过 |
| `scripts/lib/browser-abi/native-business-bindings.cjs` | 原样JS协议输入；1函数；F07 | checkBindings原文/LF/摘要，未类型化 |
| `scripts/lib/browser-abi/native-shop.cjs` | 原样JS协议输入；4函数；F08 | branch/readCurrent/dateGetterOf/sourceCheck原文，未类型化 |
| `scripts/lib/browser-abi/wardrobe-mapping.cjs` | 原样JS协议输入；2函数；F09 | reader/branchGuard原文，未类型化 |
| `scripts/lib/browser-abi/shop-mapping.cjs` | 原样JS协议输入；1函数；F09 | reader原文，未类型化 |
| `scripts/lib/browser-abi/native-control.cjs` | 原样JS协议输入；1函数；F10 | clickReader原文，未类型化 |
| `scripts/lib/browser-abi/native-history.cjs` | 原样JS协议输入；F11 | 2函数体未类型化，原文/摘要/旧帧 |
| `scripts/lib/browser-abi/native-save.cjs` | 原样JS协议输入；F11 | 2函数体未类型化，原文/摘要/旧帧 |
| `scripts/lib/browser-abi/native-environment.cjs` | 原样JS协议输入；F11 | 8函数体未类型化，原文/摘要/旧帧 |
| `scripts/lib/browser-abi/native-state-contracts.cjs` | 原样JS协议输入；F12 | 7函数体未类型化，原文/LF/旧接收器保持 |
| `scripts/lib/browser-abi/native-navigation-operation.cjs` | 原样JS协议输入；F12 | 2函数体未类型化，原文/LF/旧接收器保持 |
| `scripts/lib/browser-abi/native-shop-operation.cjs` | 原样JS协议输入；F12 | 1函数体未类型化，原文/LF/旧接收器保持 |
| `scripts/lib/browser-abi/native-shop-menu-operation.cjs` | 原样JS协议输入；F12 | 2函数体未类型化，原文/LF/旧接收器保持 |
| `scripts/lib/browser-abi/native-wardrobe-operation.cjs` | 原样JS协议输入；F12 | 1函数体未类型化，原文/LF/旧接收器保持 |
| `scripts/lib/browser/widget-source.cjs` | DOM-only TS生成；F03真实CDP闭包通过 |
| `scripts/lib/browser/goal-reader.cjs` | DOM-only TS生成；F04本机通过 |
| `scripts/lib/browser/receipts.cjs` | DOM-only TS生成；F06本机通过 |
| `scripts/lib/browser/recorder.cjs` | DOM-only TS生成；E10本机通过 |
| `scripts/lib/browser/timeline.cjs` | DOM-only TS生成；E10本机通过 |
| `scripts/lib/browser/integration-patch-observation.cjs` | DOM-only TS生成；E10本机通过 |
| `scripts/lib/browser/integration-soft-wet.cjs` | DOM-only TS生成；E10本机通过 |
| `scripts/lib/browser/integration-soft-wet-gameplay.cjs` | DOM-only TS生成；E10本机通过 |
| `scripts/lib/browser/integration-native-head-state.cjs` | DOM-only TS生成；E10本机通过 |
| `scripts/lib/browser/integration-native-head-recovery.cjs` | DOM-only TS生成；E10本机通过 |
| `integrations/soft-and-wet/browser-abi/native-head-operation.cjs` | 冻结JS协议输入；E10，1函数体未类型化 |
| `scripts/lib/browser/game-dol-provider.cjs` | DOM-only TS生成；最终Mac/真实Chrome通过 |
| `scripts/lib/browser/native-goal.cjs` | DOM-only TS生成；固定7场景/真实Chrome通过 |
| `scripts/lib/browser-abi/native-generic-landing.cjs` | 冻结JS协议输入；2函数体未类型化，最终旧合同保持性通过 |
| `scripts/lib/browser-abi/native-time.cjs` | 冻结JS协议输入；1函数体未类型化，最终旧合同保持性通过 |
| `scripts/lib/browser-abi/native-street-recovery.cjs` | 冻结JS协议输入；1函数体未类型化，最终旧合同保持性通过 |
| `scripts/lib/browser-abi/native-radio.cjs` | 冻结JS协议输入；2函数体未类型化，最终旧合同保持性通过 |
| `scripts/lib/browser-abi/native-shop-menu.cjs` | 冻结JS协议输入；2函数体未类型化，最终旧合同保持性通过 |
| `scripts/lib/browser-abi/project-operation.cjs` | 冻结JS协议输入；1函数体未类型化，最终旧合同保持性通过 |

最终固定代码`54187d78602dff7d23c91a521be512ee361ac786`；[完整Mac报告](CLOSEOUT_MAC.md)、[固定包manifest](package-core-g-manifest.json)。剩余实施：本机TS线无；待验收：Windows/Android/真实游戏与历史真实回执。F07初始空文档仍未解决，另列已知问题，不作已修声明。

F07后续诊断已交付，固定代码`93facebe38a81ecbe2b6e2d9976ed92ef45b5926`；不重做TS迁移，完整Node632项631过/1跳过，启动控制源码/最低Node包各3组。历史物理根因仍Unknown。见[本批报告](../startup/REPORT.md)，同步/CI后停止。
