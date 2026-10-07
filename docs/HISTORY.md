# DoL Dev Tools: Paisley Park — 历史索引

2.0.0起采用产品名DoL Dev Tools: Paisley Park。以下为原DoL Dev Tools的历史交付与证据，保留当时版本、名称和验收边界；原始提案不因新品牌而改写。

| 历史版本 | 记录 |
| --- | --- |
| 3.0.2 / v3.0.2 | [Gold Experience Requiem 发布说明](RELEASE_3.0.2.md)、[当前验收与限制](CLOSEOUT_3_0_2.md) |
| 3.0.1（公开 Release / tag 已删除） | [历史发布说明](RELEASE_3.0.1.md)、[S1/S2 代表性证明](CLOSEOUT_3_0_1.md) |
| 3.0.0（公开 Release / tag 已删除） | [原发布说明](RELEASE_3.0.0.md)、[Foundation A—D证明](CLOSEOUT_3_0.md)、[撤版](WITHDRAWAL_3.0.0.md)、[新的研发方案](GOLD_EXPERIENCE_REAUDIT.md) |
| 2.0.1 / v2.0.1 | [实战经验指引补丁](RELEASE_2.0.1.md) |
| 2.0.0 / v2.0.0 | [Paisley Park品牌重置](RELEASE_2.0.0.md) |
| 1.0 / v1.0.0 | [通用诊断重置](RELEASE_1.0.md) |
| 1.1 / v1.1.0 | [Integration Contract 1](INTEGRATIONS.md)、[历史验证](VALIDATION.md) |
| 1.2 / v1.2.0 | [有限复现与独立Skill](RELEASE_1.2.md) |
| 1.3 / v1.3.0 | [生命周期与证据工作流](RELEASE_1.3.md) |
| 1.4 / v1.4.0 | [原生重建与真实Mod更新](RELEASE_1.4.md) |
| 1.5 / v1.5.0 | [完整能力验收](RELEASE_1.5.md)、[收口与Coverage Ledger](CLOSEOUT_1_5.md) |
| 1.5.1 / 1.5.2 | [首次试用反馈](RELEASE_1.5.1.md)、[实战Skill封装](RELEASE_1.5.2.md)；此前仅有本地交付，不虚构旧GitHub Release |

2026-10-08 按用户明确要求重置公开 3.0 提交链，删除 v3.0.0 / v3.0.1 Release、tag 和旧分支引用，v3.0.2 绑定重置后的实现及资产；v2.0.1 及更早历史保持保留。旧 3.0 实现、失败与验证记录仍保留为历史证据，完整旧 Git 历史和资产另有本地备份。本文中的旧发布说明是历史资料，不是可下载 Release 的承诺。Schema 1 的稳定 URN 与夹具内部标识按原约定继续工作。

## 早期入口与相邻项目

0.2.0 的独立 Android CLI 采集在 Windows / Android CLI 1.0.16486076 与实际手机验证了四步采集：PNG 1200×2608、非空 layout、失败记录与防覆盖。该记录不证明所有设备、系统对话框、APK 增量部署或 Journey。独立采集、CDP Evaluator 和私有应用备份入口继续保留，操作说明从首页移至 [DIAGNOSTICS](DIAGNOSTICS.md#独立-android-cli-与兼容入口)。

1.0 重置保留这些旧脚本，Evidence 继续使用 Schema 1；1.2—1.5 的能力、测试数量和当轮证明边界以对应 RELEASE / VALIDATION 为准，不合并成当前版本的全环境保证。

DoL Game UI 的构建脚本与桌面回归在该项目维护，工具包不复制实现。此前首页提供的使用入口保留如下：

```sh
git clone https://github.com/102326/DoL-Game-UI.git
cd DoL-Game-UI
npm ci
npm run test:quick
npm run package
npm run test:release -- --plan
```

当时要求 Node.js 22.12+、Python 3.10+；完整游戏集成与性能测试另需自行取得游戏资源和 Microsoft Edge，`--plan` 只列计划和缺少的资源。本轮未重新核对相邻项目命令，当前用法以该仓库的 [开发文档](https://github.com/102326/DoL-Game-UI/blob/main/docs/DEVELOPMENT.md) 为准。本工具包不自动下载游戏或安装浏览器。
