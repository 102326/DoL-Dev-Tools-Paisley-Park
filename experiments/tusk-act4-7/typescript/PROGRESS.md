# TS First 执行进度与完成清单

2026-11-05。用户已批准完整Node核心迁移作为7.0发布门槛；开发包P2，UI4.2为P1。按依赖继续本机研发，不因首批通过宣称整体完成。正式发布另行授权，Windows/Android/真实游戏验收保留。

固定开工基线：`18544c8d1cb2a751130bf023cfc37b531ed6b722`。完整方案见[实施计划](../../../docs/superpowers/plans/2026-11-05-tusk-act4-ts-first.md)。本清单仅为工程记录，不是第二个Runtime或执行系统。

## 批次

- A 构建正式化：本机验收完成，代码`0196e86989facae13e765dc3bff58046b53502a7`。隔离开发包、完整Program、5个生成产物、漂移/部分写入/回滚/权限/协作锁检查。
- B diagnostics/runtime-target：本机验收完成。CJS导出与目标键保留，14类型负对照通过，44定向回归通过；独立包最低Node26和10项Chrome夹具通过；4项构建保护、527项全套中526通过/1Windows跳过。详见[BATCH_AB](BATCH_AB.md)。
- C CDP/IPC/宿主：进行中。C01的CDP/IPC/worker已通过本机验收，固定代码`eb8e13ad4e5ac2d1b6b10f03714a94041b339b49`；532项全套中531通过/1Windows跳过，22类型负例、最低Node26独立包10项Chrome通过。详见[BATCH_C01](BATCH_C01.md)。宿主与执行上下文待后续子批。
- D 浏览器边界：待实施，原32个静态命中需逐项核对，不凭编译通过勾选。
- E CLI/Action/Journey/Evidence：待实施。
- F GER/Session/业务Provider：待实施，源码指纹与旧未决恢复是硬合同。
- G 适合的开发/验证工具：随批维护测试，剩余迁移待实施；Markdown/Kotlin/Python不机械替换。

## 核心模块清单

开工运行集合95个CJS。此表记录Node模块迁移；7个权威TS已接入strict构建，整体未完成。额外新增运行模块须纳入后续清单，不能以固定分母隐去新增工作。函数源码插值静态命中32个，不是完整数据流证明。

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
| `scripts/lib/animation.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/app-lifecycle.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/cdp.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/chrome-evidence.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/chrome-host.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/chrome-launch.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/collectors.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/css.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/deep.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/diagnostics.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/doctor.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/dom.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/environment.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/evidence-tools.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/evidence.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/execution-context.cjs` | 待迁移 | 未命中该静态模式 |
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
| `scripts/lib/host-options.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/inspectors.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/install-skill.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/integration-worker.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/integration.cjs` | strict构建已接入，C01本机通过 | 未命中该静态模式 |
| `scripts/lib/journey.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/logcat.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/matrix.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/native-layout.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/network-lab.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/owned-files.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/pc-http.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/pc-session.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/performance-series.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/performance.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/privacy.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/process-memory.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/record.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/recorder.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/runtime-target.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/source-find-cli.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/source-find.cjs` | strict构建已接入，A+B本机通过 | 未命中该静态模式 |
| `scripts/lib/support.cjs` | 待迁移 | 未命中该静态模式 |
| `scripts/lib/timeline.cjs` | 待迁移 | 待逐项处理源码注入/摘要边界 |
| `scripts/lib/viewport.cjs` | 待迁移 | 未命中该静态模式 |
