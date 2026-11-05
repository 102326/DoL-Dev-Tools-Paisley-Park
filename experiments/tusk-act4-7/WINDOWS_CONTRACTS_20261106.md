# Windows contracts 动态探针补验

2026-11-06（Asia/Shanghai）。**本批选定的七组中性合同探针达到 Scoped Done**：源码和独立包各七组通过，每套各 45 项检查，资源清理确认。没有修改生产代码、重跑完整 Node 套件或基础 PC/GER 批次，也没有访问平板或真实游戏。

## Delivered / Validated

开始时工作区干净，本地和远端均为 `34ae5ca3dd9cd547554f1d4baf5d65a3da9542d8`。实际代码仍是 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`；两者之间的 runtime、integration、Schema、依赖及 Skill 没有变化。

复用原 431 文件独立 ZIP，SHA-256 为 `62b95509df39b010602235922a275d32109000b53a1423bc1b34a599bf39a8da`。开跑前重新核对解压后的原 431 个文件，逐一匹配已有清单；没有重新打包、从源码借用模块或改安装位置。该包此前已在源码树外的中文空格路径按锁安装 XState。

本轮实际运行 Node **26.12.1**、Chrome **156.0.8078.80**、Windows build 26340.0、PowerShell 7.6.5。所有浏览器均为本轮自有无头实例，使用自写中性页面、独立 Profile / origin 和新输出目录；顺序执行，未抢占可见桌面。不是 Android、真实 DoL 或 Mac 历史结果。

| 现有脚本，位于 `contracts/` | 本轮覆盖 | 源码 | 独立包 |
| --- | --- | --- | --- |
| `verify.cjs` | 真实 V8 Widget/宏闭包、唯一原定义、来源变更拒绝、持有对象释放，证明 attestation 不调用业务函数 | 7/7 | 7/7 |
| `goal-proof-verify.cjs` | 自写 State/DOM 下的 Goal 判据，保留不可用/不满足边界 | 8/8 | 8/8 |
| `receipt-verify.cjs` | 自写页面回执的 nonce、64 条容量边界、原 terminal 读取、已结算回收与 pending 保留 | 8/8 | 8/8 |
| `business-bindings-verify.cjs` | 原函数/词法 State、来源与对象归属，拒绝不匹配的绑定 | 6/6 | 6/6 |
| `control-verify.cjs` | 实际远端词法元数据、唯一原 handler、外来 handler 拒绝及 group 释放 | 6/6 | 6/6 |
| `save-observer-verify.cjs` | 自有 IndexedDB 的 abort/commit/无写入，独立存储读回及 prototype/hook 还原 | 5/5 | 5/5 |
| `probes-verify.cjs` | 自有 DOM 的 recorder/timeline 与可信桌面 CDP 输入、采集范围和自有句柄清理 | 5/5 | 5/5 |

两套各 45 项是同一组检查在两个工具根运行，不合称 90 项独立业务能力。保存观察器使用自写存储 owner 和新建 IndexedDB；页面回执使用合成 terminal。它们验证真实 Windows Chrome/CDP 与生产合同实现的接线，**不证明真实游戏保存、实际 Effect Ledger 或旧 Unknown 已通过验收**。

每次命令均使用 `node --no-strip-types experiments/tusk-act4-7/contracts/SCRIPT ABS_CHROME NEW_OUTPUT`。源码阶段的 `PAISLEY_TOOL_ROOT` 指向当前工作树；独立包阶段指向已核验的解压工具根。结构化结果见 [Windows contracts 结果](windows-contracts-results.json)，包身份见 [既有逐文件清单](windows-package-manifest.json)。

14 次进程运行均退出 0，结果 passed，cleanup confirmed；保存观察器的 observer/browser cleanup 也均 confirmed。结束时未观察到记录的 14 个浏览器 PID 存活，18777–18783 无监听。合成 Profile、日志和原始实验输出保留在本地忽略目录，不上传。没有重新派发此前保存、读取玩家存档或清除已有 pending。

## 当前事实与旧交接说明

任务书和 Mac 批次报告中的“这些 contracts 尚未在 Windows 运行”是原交接状态；以上七组在当前代码的 Windows 覆盖现已补齐。此前的完整 Windows Node、G 构建保护、基础 PC/GER、Integration、启动控制和只读 Android 结果继续使用各自固定输入，不在本轮重复计数。

最低 Node **26.0.0 的 Windows 运行仍未验证**。本轮检查了当前 PATH、已知本地 Node 安装目录和已有版本管理器入口，没有找到该最低版本；实际测试是 26.12.1，没有额外下载安装。Mac 的 26.0.0 结果不能替代此项。已有 G 协作锁/注入发布失败结果，也不自动证明所有真实 Windows 文件占用行为。

## Not validated / Known limitations

- 新 TS 基线的真实 DoL/GER 业务仍待复验。下一批可先在获准的本地测试 HTML、全新独立 Profile / origin / Store 中选择一个原生业务闭环，不复制玩家数据，也不通过换 Store 绕过旧未决。
- 真实历史 CRLF 回执和旧 Unknown 的跨构建恢复没有新证据；合成回执通过不能追认它们。
- 本轮未运行保存观察器的可选 `--fault-restore` 模式，未做最低 Windows Node、真实游戏、Android 或可见桌面输入验证。
- F07 初始空文档、桌面多标签截图的物理根因仍 Unknown。本批探针没有用于这些失败归因。

本批没有新的实现缺陷或范围内阻断，收口为文档和覆盖补齐。设备继续留给 UI；不会自行申请或抢回平板。真实设备/生命周期等后续步骤需要重新协调窗口。未合并 main、修改版本/Tag、发布 Release 或另发 6.1 补丁。
