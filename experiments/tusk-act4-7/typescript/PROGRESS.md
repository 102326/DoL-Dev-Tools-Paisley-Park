# TS First 执行进度与完成清单

2026-11-05。用户已批准完整Node核心迁移作为7.0发布门槛；开发包P2，UI4.2为P1。按依赖继续本机研发，不因首批通过宣称整体完成。正式发布另行授权，Windows/Android/真实游戏验收保留。

固定开工基线：`18544c8d1cb2a751130bf023cfc37b531ed6b722`。完整方案见[实施计划](../../../docs/superpowers/plans/2026-11-05-tusk-act4-ts-first.md)。本清单仅为工程记录，不是第二个Runtime或执行系统。

## 批次

- A 构建正式化：本机验收完成，代码`0196e86989facae13e765dc3bff58046b53502a7`。隔离开发包、完整Program、5个生成产物、漂移/部分写入/回滚/权限/协作锁检查。
- B diagnostics/runtime-target：本机验收完成。CJS导出与目标键保留，14类型负对照通过，44定向回归通过；独立包最低Node26和10项Chrome夹具通过；4项构建保护、527项全套中526通过/1Windows跳过。详见[BATCH_AB](BATCH_AB.md)。
- C CDP/IPC/宿主：进行中。C01的CDP/IPC/worker已通过本机验收，固定代码`eb8e13ad4e5ac2d1b6b10f03714a94041b339b49`；532项全套中531通过/1Windows跳过，22类型负例、最低Node26独立包10项Chrome通过。详见[BATCH_C01](BATCH_C01.md)。C02宿主/执行上下文已验收，代码`7d0d91baface643efa43a18cbde9248858905624`；535项中534通过/1Windows跳过，26类型负例、源码Chrome GER13/13、最低Node26包Integration10/10，见[BATCH_C02](BATCH_C02.md)。C03启动/HTTP/宿主输入已验收，代码`3e6909fa01a0dfb76868dc4072c3242bd275ff72`；536项中535通过/1Windows跳过，源码与最低Node26独立包PC12/12，见[BATCH_C03](BATCH_C03.md)。C04共享Collector/privacy/owned-files已验收，代码`e55a4d43c44462c2f4fe33370226f49a87181126`；536项535通过/1Windows跳过、32类型负例、构建4/4。首次Chrome发现超时保留，串行诊断与最低Node26包均10/10；C05已修复准备循环一次发现超时提前退出，代码`d4c09ba089492d36d54445326ef2e6cd21497223`；539项538过/1Windows跳过，故障注入3/3，源码及最低Node26包PC12/12。首次物理超时根因不作无证据推断，见[BATCH_C04](BATCH_C04.md#c05-后续只读启动等待收口)。
- D 浏览器边界：D01已验收，代码`da5eacd4179d0ea1d6d4b3008bb163f0b47f094e`；DOM/CSS双Program、23定向、12对旧/新观察、构建5/5、541项540过/1Windows跳过；源码Chrome10+13与最低Node26独立包GER13通过。见[BATCH_D01](BATCH_D01.md)。D02 Inspector也已验收，代码`88bb7dcea6d7ede5500d02935422346d70e25513`；29定向、5构建、542项541过/1Windows跳过、源码与最低Node26无依赖独立包PC12/12，见[BATCH_D02](BATCH_D02.md)。原32命中处理三项，其余继续逐项核对。
- E CLI/Action/Journey/Evidence：E01受限采集/离线解析4模块已验收，代码`3ffcd81b772bd36a920ea1afdb5bd9b4cbaed38e`；32定向及最低Node26独立包32/32，542项541过/1Windows跳过、40类型负例、5构建。见[BATCH_E01](BATCH_E01.md)。E02安装/Doctor/源码查询入口3模块已验收，代码`5ebc5d8ea75f17f05498730d9b232220fca7643b`；543项542过/1Windows跳过，定向与最低Node26包31过/1Windows跳过、41类型负例、5构建；Doctor旧Node22门槛已对齐26，见[BATCH_E02](BATCH_E02.md)。CLI主体/Support/Action/Journey/Evidence等继续。
- F GER/Session/业务Provider：待实施，源码指纹与旧未决恢复是硬合同。
- G 适合的开发/验证工具：随批维护测试，剩余迁移待实施；Markdown/Kotlin/Python不机械替换。

## 核心模块清单

开工运行集合95个Node CJS，当前26个Node权威TS接入strict；另新增3个DOM-only浏览器TS/运行CJS，运行清单共98项、strict源共29项，整体未完成。额外新增运行模块须纳入后续清单，不能以固定分母隐去新增工作。函数源码插值静态命中32个，不是完整数据流证明。

| 原运行入口 | Node迁移 | 浏览器边界 |
| --- | --- | --- |
| `.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `integrations/examples/dom-summary.cjs` | 待迁移 | 未命中该静态模式 |
| `integrations/examples/native-lifecycle.cjs` | 待迁移 | 未命中该静态模式 |
| `integrations/examples/patch-observation.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `integrations/soft-and-wet/gameplay.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `integrations/soft-and-wet/index.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `integrations/soft-and-wet/native-head.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `integrations/soft-and-wet/source-link.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/adb-evaluate.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/android-inspect.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/dol-dev.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/action.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/animation.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/app-lifecycle.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/cdp.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/chrome-evidence.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/chrome-host.cjs` | strict构建已接入，C02本机通过 | 未命中该静态模式 |
| `scripts/lib/chrome-launch.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/collectors.cjs` | strict构建已接入，C04本机通过 | 未命中该静态模式 |
| `scripts/lib/css.cjs` | strict构建已接入，D01本机通过 | DOM-only独立Program，固定旧输出/真实Chrome通过 |
| `scripts/lib/deep.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/diagnostics.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/doctor.cjs` | strict构建已接入，E02本机通过 | 未命中该静态模式 |
| `scripts/lib/dom.cjs` | strict构建已接入，D01本机通过 | DOM-only独立Program，固定旧输出/真实Chrome通过 |
| `scripts/lib/environment.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/evidence-tools.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/evidence.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/execution-context.cjs` | strict构建已接入，C02本机通过 | 未命中该静态模式 |
| `scripts/lib/game-capabilities.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-clothing-provider.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-contract.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-dol-provider.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-goal-reader.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-goal.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-business-bindings.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-control.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-daily-state.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-environment.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-garden-state.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-generic-landing.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-hall-state.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-history.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-hour-state.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-invocation.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-navigation.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-profile.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-provider.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-radio.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-render-tasks.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-save.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-street-recovery.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-native-street-state.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-native-time.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-navigation-operation.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-project-provider.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-receipts.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-resource.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-runtime.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-scope.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-semantic.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-shop-menu-native.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-shop-menu-operation.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-shop-native.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-shop-operation.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-shop.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-spend.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-wardrobe-native.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/game-wardrobe-operation.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/game-wardrobe.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/hitbox-overlay.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/host-options.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/inspectors.cjs` | strict构建已接入，D02本机通过 | DOM-only六模式/storage，固定旧观察与真实Chrome通过 |
| `scripts/lib/install-skill.cjs` | strict构建已接入，E02本机通过 | 未命中该静态模式 |
| `scripts/lib/integration-worker.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/integration.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/journey.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/logcat.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/matrix.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/native-layout.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/network-lab.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/owned-files.cjs` | strict构建已接入，C04本机通过 | 未命中该静态模式 |
| `scripts/lib/pc-http.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/pc-session.cjs` | strict构建已接入，C03本机通过 | 未命中该静态模式 |
| `scripts/lib/performance-series.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/performance.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/privacy.cjs` | strict构建已接入，C04本机通过 | 未命中该静态模式 |
| `scripts/lib/process-memory.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/record.cjs` | strict构建已接入，E01本机通过 | 未命中该静态模式 |
| `scripts/lib/recorder.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/runtime-target.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/source-find-cli.cjs` | strict构建已接入，E02本机通过 | 未命中该静态模式 |
| `scripts/lib/source-find.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/support.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/timeline.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/viewport.cjs` | 待迁移 | 未命中该静态模式 |

## 新增运行资产（纳入清单，不隐藏新增工作）

| 运行入口 | 角色与状态 |
| --- | --- |
| `scripts/lib/browser/dom.cjs` | DOM-only TS生成；D01本机通过 |
| `scripts/lib/browser/css.cjs` | DOM-only TS生成；D01本机通过 |
| `scripts/lib/browser/inspectors.cjs` | DOM-only TS生成；D02本机通过 |
